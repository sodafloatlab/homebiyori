"""
統一DynamoDBクライアント

Homebiyori（ほめびより）全サービスで共通利用するDynamoDB操作クライアント。
- Single Table Design最適化
- 高性能非同期操作
- 統一エラーハンドリング
- ページネーション・バッチ処理対応
- トランザクション操作サポート
"""

import asyncio
import boto3
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, TypedDict
from decimal import Decimal
from botocore.exceptions import ClientError

from ..logger import get_logger
from ..exceptions import DatabaseError, ConflictError
from ..utils.datetime_utils import get_current_jst, to_jst_string


class QueryResult(TypedDict, total=False):
    """クエリ結果型定義"""
    items: List[Dict[str, Any]]
    count: int
    scanned_count: int
    last_evaluated_key: Optional[Dict[str, Any]]
    has_more: bool
    next_token: Optional[str]


class ScanResult(TypedDict, total=False):
    """スキャン結果型定義"""
    items: List[Dict[str, Any]]
    count: int
    scanned_count: int
    last_evaluated_key: Optional[Dict[str, Any]]
    has_more: bool
    next_token: Optional[str]


class DynamoDBClient:
    """
    統一DynamoDBクライアント
    
    Homebiyori全サービス共通のDynamoDB操作を提供。
    Single Table Design に最適化された高性能クライアント。
    """
    
    def __init__(self, table_name: str, region_name: str = "ap-northeast-1"):
        """
        クライアント初期化
        
        Args:
            table_name: DynamoDBテーブル名（必須）
            region_name: AWSリージョン名
        """
        
        # 4テーブル構成対応：table_name必須、デフォルト値なし
        if not table_name:
            raise ValueError("table_name is required for 4-table architecture")
        self.table_name = table_name
        self.region_name = region_name
        self.logger = get_logger(__name__)
        
        # DynamoDBクライアント初期化
        try:
            self.dynamodb = boto3.resource('dynamodb', region_name=self.region_name)
            self.table = self.dynamodb.Table(self.table_name)
            self.client = boto3.client('dynamodb', region_name=self.region_name)
            
            self.logger.info(f"DynamoDBクライアント初期化完了: table={self.table_name}")
            
        except Exception as e:
            self.logger.error(f"DynamoDBクライアント初期化エラー: {e}")
            raise DatabaseError(f"DynamoDBクライアントの初期化に失敗しました: {e}")
    
    # =====================================
    # 基本CRUD操作
    # =====================================
    
    async def get_item(
        self, 
        pk: str, 
        sk: str,
        projection_expression: Optional[str] = None,
        consistent_read: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        アイテム取得
        
        Args:
            pk: パーティションキー
            sk: ソートキー  
            projection_expression: 取得するアトリビュート指定
            consistent_read: 強一貫性読み取り
            
        Returns:
            Dict: アイテムデータ（存在しない場合はNone）
        """
        try:
            key = {"PK": pk, "SK": sk}
            
            get_params = {
                "Key": key,
                "ConsistentRead": consistent_read
            }
            
            if projection_expression:
                get_params["ProjectionExpression"] = projection_expression
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: self.table.get_item(**get_params)
            )
            
            item = response.get("Item")
            if item:
                # Decimal型を適切な型に変換
                item = self._deserialize_item(item)
                self.logger.debug(f"アイテム取得成功: PK={pk}, SK={sk}")
            
            return item
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            self.logger.error(f"DynamoDB取得エラー: PK={pk}, SK={sk}, error={error_code}")
            raise DatabaseError(
                f"アイテムの取得に失敗しました: {e}",
                operation="get_item",
                table=self.table_name
            )
        except Exception as e:
            self.logger.error(f"予期しない取得エラー: PK={pk}, SK={sk}, error={e}")
            raise DatabaseError(f"アイテムの取得で予期しないエラーが発生しました: {e}")
    
    async def put_item(
        self,
        item: Dict[str, Any],
        condition_expression: Optional[str] = None,
        expression_attribute_names: Optional[Dict[str, str]] = None,
        expression_attribute_values: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        アイテム保存
        
        Args:
            item: 保存するアイテムデータ
            condition_expression: 条件式
            expression_attribute_names: アトリビュート名マッピング
            expression_attribute_values: アトリビュート値マッピング
        """
        try:
            # Decimal型変換とメタデータ追加
            processed_item = self._serialize_item(item.copy())
            processed_item["updated_at"] = to_jst_string(get_current_jst())
            
            put_params = {"Item": processed_item}
            
            if condition_expression:
                put_params["ConditionExpression"] = condition_expression
            if expression_attribute_names:
                put_params["ExpressionAttributeNames"] = expression_attribute_names
            if expression_attribute_values:
                put_params["ExpressionAttributeValues"] = expression_attribute_values
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.table.put_item(**put_params)
            )
            
            self.logger.debug(f"アイテム保存成功: PK={item.get('PK')}, SK={item.get('SK')}")
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            
            if error_code == "ConditionalCheckFailedException":
                raise ConflictError(
                    f"条件チェック失敗: {condition_expression}",
                    resource_type="DynamoDB Item",
                    conflict_reason="condition_failed"
                )
            
            self.logger.error(f"DynamoDB保存エラー: error={error_code}")
            raise DatabaseError(
                f"アイテムの保存に失敗しました: {e}",
                operation="put_item",
                table=self.table_name
            )
        except Exception as e:
            self.logger.error(f"予期しない保存エラー: {e}")
            raise DatabaseError(f"アイテムの保存で予期しないエラーが発生しました: {e}")
    
    async def update_item(
        self,
        pk: str,
        sk: str,
        update_expression: str,
        expression_values: Dict[str, Any],
        expression_names: Optional[Dict[str, str]] = None,
        condition_expression: Optional[str] = None,
        return_values: str = "UPDATED_NEW"
    ) -> Optional[Dict[str, Any]]:
        """
        アイテム更新
        
        Args:
            pk: パーティションキー
            sk: ソートキー
            update_expression: 更新式
            expression_values: 更新値
            expression_names: アトリビュート名マッピング
            condition_expression: 条件式
            return_values: 戻り値設定
            
        Returns:
            Dict: 更新されたアトリビュート
        """
        try:
            key = {"PK": pk, "SK": sk}
            
            # updated_atを自動追加
            if ":updated_at" not in expression_values:
                update_expression += ", updated_at = :updated_at"
                expression_values[":updated_at"] = to_jst_string(get_current_jst())
            
            update_params = {
                "Key": key,
                "UpdateExpression": update_expression,
                "ExpressionAttributeValues": self._serialize_expression_values(expression_values),
                "ReturnValues": return_values
            }
            
            if expression_names:
                update_params["ExpressionAttributeNames"] = expression_names
            if condition_expression:
                update_params["ConditionExpression"] = condition_expression
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.table.update_item(**update_params)
            )
            
            self.logger.debug(f"アイテム更新成功: PK={pk}, SK={sk}")
            
            attributes = response.get("Attributes")
            return self._deserialize_item(attributes) if attributes else None
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            
            if error_code == "ConditionalCheckFailedException":
                raise ConflictError(
                    f"更新条件チェック失敗: {condition_expression}",
                    resource_type="DynamoDB Item",
                    conflict_reason="condition_failed"
                )
            
            self.logger.error(f"DynamoDB更新エラー: PK={pk}, SK={sk}, error={error_code}")
            raise DatabaseError(
                f"アイテムの更新に失敗しました: {e}",
                operation="update_item", 
                table=self.table_name
            )
        except Exception as e:
            self.logger.error(f"予期しない更新エラー: PK={pk}, SK={sk}, error={e}")
            raise DatabaseError(f"アイテムの更新で予期しないエラーが発生しました: {e}")
    
    async def delete_item(
        self,
        pk: str,
        sk: str,
        condition_expression: Optional[str] = None,
        expression_attribute_names: Optional[Dict[str, str]] = None,
        expression_attribute_values: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        アイテム削除
        
        Args:
            pk: パーティションキー
            sk: ソートキー
            condition_expression: 削除条件
            expression_attribute_names: アトリビュート名マッピング
            expression_attribute_values: アトリビュート値マッピング
            
        Returns:
            Dict: 削除されたアイテム
        """
        try:
            key = {"PK": pk, "SK": sk}
            
            delete_params = {
                "Key": key,
                "ReturnValues": "ALL_OLD"
            }
            
            if condition_expression:
                delete_params["ConditionExpression"] = condition_expression
            if expression_attribute_names:
                delete_params["ExpressionAttributeNames"] = expression_attribute_names
            if expression_attribute_values:
                delete_params["ExpressionAttributeValues"] = expression_attribute_values
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.table.delete_item(**delete_params)
            )
            
            self.logger.debug(f"アイテム削除成功: PK={pk}, SK={sk}")
            
            attributes = response.get("Attributes")
            return self._deserialize_item(attributes) if attributes else None
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            
            if error_code == "ConditionalCheckFailedException":
                raise ConflictError(
                    f"削除条件チェック失敗: {condition_expression}",
                    resource_type="DynamoDB Item",
                    conflict_reason="condition_failed"
                )
            
            self.logger.error(f"DynamoDB削除エラー: PK={pk}, SK={sk}, error={error_code}")
            raise DatabaseError(
                f"アイテムの削除に失敗しました: {e}",
                operation="delete_item",
                table=self.table_name
            )
        except Exception as e:
            self.logger.error(f"予期しない削除エラー: PK={pk}, SK={sk}, error={e}")
            raise DatabaseError(f"アイテムの削除で予期しないエラーが発生しました: {e}")
    
    # =====================================
    # クエリ・スキャン操作
    # =====================================
    
    async def query(
        self,
        pk: str,
        sk_condition: Optional[str] = None,
        filter_expression: Optional[str] = None,
        expression_values: Optional[Dict[str, Any]] = None,
        expression_names: Optional[Dict[str, str]] = None,
        index_name: Optional[str] = None,
        projection_expression: Optional[str] = None,
        limit: Optional[int] = None,
        scan_index_forward: bool = True,
        exclusive_start_key: Optional[Dict[str, Any]] = None,
        consistent_read: bool = False
    ) -> QueryResult:
        """
        クエリ実行
        
        Args:
            pk: パーティションキー値
            sk_condition: ソートキー条件（例: "begins_with(SK, :sk_prefix)"）
            filter_expression: フィルタ条件
            expression_values: 条件値マッピング
            expression_names: アトリビュート名マッピング
            index_name: インデックス名（GSI/LSI）
            projection_expression: 取得アトリビュート指定
            limit: 取得件数制限
            scan_index_forward: ソート順（True=昇順、False=降順）
            exclusive_start_key: ページネーション開始キー
            consistent_read: 強一貫性読み取り
            
        Returns:
            QueryResult: クエリ結果
        """
        try:
            # キー条件式構築
            key_condition = "PK = :pk"
            values = {":pk": pk}
            
            if sk_condition:
                key_condition += f" AND {sk_condition}"
            
            if expression_values:
                values.update(expression_values)
            
            query_params = {
                "KeyConditionExpression": key_condition,
                "ExpressionAttributeValues": self._serialize_expression_values(values),
                "ScanIndexForward": scan_index_forward
            }
            
            if index_name:
                query_params["IndexName"] = index_name
                # GSI用のキー条件調整
                if index_name.startswith("GSI"):
                    gsi_pk = f"{index_name}PK"
                    query_params["KeyConditionExpression"] = query_params["KeyConditionExpression"].replace("PK", gsi_pk)
            
            if filter_expression:
                query_params["FilterExpression"] = filter_expression
            if expression_names:
                query_params["ExpressionAttributeNames"] = expression_names
            if projection_expression:
                query_params["ProjectionExpression"] = projection_expression
            if limit:
                query_params["Limit"] = limit
            if exclusive_start_key:
                query_params["ExclusiveStartKey"] = exclusive_start_key
            if not index_name:  # メインテーブルのみ
                query_params["ConsistentRead"] = consistent_read
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.table.query(**query_params)
            )
            
            # 結果処理
            items = [self._deserialize_item(item) for item in response.get("Items", [])]
            
            result: QueryResult = {
                "items": items,
                "count": response.get("Count", 0),
                "scanned_count": response.get("ScannedCount", 0),
                "has_more": "LastEvaluatedKey" in response
            }
            
            if "LastEvaluatedKey" in response:
                result["last_evaluated_key"] = response["LastEvaluatedKey"]
                result["next_token"] = self._encode_pagination_token(response["LastEvaluatedKey"])
            
            self.logger.debug(f"クエリ実行成功: PK={pk}, count={result['count']}")
            return result
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            self.logger.error(f"DynamoDBクエリエラー: PK={pk}, error={error_code}")
            raise DatabaseError(
                f"クエリの実行に失敗しました: {e}",
                operation="query",
                table=self.table_name
            )
        except Exception as e:
            self.logger.error(f"予期しないクエリエラー: PK={pk}, error={e}")
            raise DatabaseError(f"クエリで予期しないエラーが発生しました: {e}")
    
    # =====================================
    # プレフィックスクエリ（よく使用されるパターン）
    # =====================================
    
    async def query_by_prefix(
        self,
        pk: str,
        sk_prefix: str,
        sk_condition: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> QueryResult:
        """
        SKプレフィックスによるクエリ
        
        Args:
            pk: パーティションキー
            sk_prefix: ソートキープレフィックス
            sk_condition: 追加のSK条件（between, >=, <= など）
            **kwargs: その他のクエリパラメータ
            
        Returns:
            QueryResult: クエリ結果
        """
        if sk_condition:
            # 複合条件の場合
            if "between" in sk_condition:
                sk_condition_expr = "SK BETWEEN :sk_start AND :sk_end"
                expression_values = {
                    ":sk_start": sk_condition["between"][0],
                    ":sk_end": sk_condition["between"][1]
                }
            elif ">=" in sk_condition:
                sk_condition_expr = "begins_with(SK, :sk_prefix) AND SK >= :sk_value"
                expression_values = {
                    ":sk_prefix": sk_prefix,
                    ":sk_value": sk_condition[">="]
                }
            elif "<=" in sk_condition:
                sk_condition_expr = "begins_with(SK, :sk_prefix) AND SK <= :sk_value"
                expression_values = {
                    ":sk_prefix": sk_prefix,
                    ":sk_value": sk_condition["<="]
                }
            else:
                sk_condition_expr = "begins_with(SK, :sk_prefix)"
                expression_values = {":sk_prefix": sk_prefix}
        else:
            sk_condition_expr = "begins_with(SK, :sk_prefix)"
            expression_values = {":sk_prefix": sk_prefix}
        
        # 既存のexpression_valuesとマージ
        if "expression_values" in kwargs:
            expression_values.update(kwargs["expression_values"])
            kwargs["expression_values"] = expression_values
        else:
            kwargs["expression_values"] = expression_values
        
        return await self.query(
            pk=pk,
            sk_condition=sk_condition_expr,
            **kwargs
        )

    # =====================================
    # ページネーション付きクエリ
    # =====================================
    
    async def query_with_pagination(
        self,
        pk: str,
        sk_condition: Optional[str] = None,
        next_token: Optional[str] = None,
        limit: int = 50,
        **kwargs
    ) -> QueryResult:
        """
        ページネーション付きクエリ
        
        Args:
            pk: パーティションキー
            sk_condition: ソートキー条件
            next_token: ページネーショントークン
            limit: ページサイズ
            **kwargs: その他のクエリパラメータ
            
        Returns:
            QueryResult: ページネーション情報付きクエリ結果
        """
        exclusive_start_key = None
        if next_token:
            exclusive_start_key = self._decode_pagination_token(next_token)
        
        return await self.query(
            pk=pk,
            sk_condition=sk_condition,
            exclusive_start_key=exclusive_start_key,
            limit=limit,
            **kwargs
        )
    
    # =====================================
    # GSIクエリ
    # =====================================
    
    async def query_gsi(
        self,
        gsi_name: str,
        pk: str,
        sk_prefix: Optional[str] = None,
        sk_condition: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> QueryResult:
        """
        GSI（Global Secondary Index）クエリ
        
        Args:
            gsi_name: GSI名
            pk: GSIパーティションキー値
            sk_prefix: GSIソートキープレフィックス
            sk_condition: 追加のSK条件
            **kwargs: その他のクエリパラメータ
            
        Returns:
            QueryResult: クエリ結果
        """
        # GSIクエリの場合、プレフィックス処理
        if sk_prefix and not sk_condition:
            sk_condition_expr = "begins_with(GSI1SK, :sk_prefix)"
            expression_values = {":sk_prefix": sk_prefix}
        elif sk_condition:
            # 複合条件の場合（プレフィックス + 範囲など）
            if "between" in sk_condition:
                sk_condition_expr = "GSI1SK BETWEEN :sk_start AND :sk_end"
                expression_values = {
                    ":sk_start": sk_condition["between"][0],
                    ":sk_end": sk_condition["between"][1]
                }
            else:
                sk_condition_expr = "begins_with(GSI1SK, :sk_prefix)"
                expression_values = {":sk_prefix": sk_prefix}
        else:
            sk_condition_expr = None
            expression_values = {}
        
        # 既存のexpression_valuesとマージ
        if "expression_values" in kwargs:
            expression_values.update(kwargs["expression_values"])
            kwargs["expression_values"] = expression_values
        elif expression_values:
            kwargs["expression_values"] = expression_values
        
        return await self.query(
            pk=pk,
            sk_condition=sk_condition_expr,
            index_name=gsi_name,
            **kwargs
        )
    
    # =====================================
    # バッチ操作
    # =====================================
    
    async def batch_get_items(self, keys: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        バッチ取得
        
        Args:
            keys: 取得するキーのリスト（{"PK": "value", "SK": "value"}）
            
        Returns:
            List[Dict]: 取得されたアイテムのリスト
        """
        try:
            if not keys:
                return []
            
            # DynamoDBバッチ取得制限（100件）でチャンク分割
            chunk_size = 100
            all_items = []
            
            for i in range(0, len(keys), chunk_size):
                chunk_keys = keys[i:i + chunk_size]
                
                request_items = {
                    self.table_name: {
                        "Keys": chunk_keys
                    }
                }
                
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.dynamodb.batch_get_item(RequestItems=request_items)
                )
                
                items = response.get("Responses", {}).get(self.table_name, [])
                all_items.extend([self._deserialize_item(item) for item in items])
                
                # 未処理キーがある場合の処理
                unprocessed = response.get("UnprocessedKeys", {})
                if unprocessed:
                    self.logger.warning(f"未処理キーが存在: {len(unprocessed)}")
            
            self.logger.debug(f"バッチ取得完了: requested={len(keys)}, retrieved={len(all_items)}")
            return all_items
            
        except Exception as e:
            self.logger.error(f"バッチ取得エラー: {e}")
            raise DatabaseError(f"バッチアイテム取得に失敗しました: {e}")
    
    # =====================================
    # ヘルスチェック・メタデータ
    # =====================================
    
    async def describe_table(self) -> Dict[str, Any]:
        """テーブル情報取得"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.describe_table(TableName=self.table_name)
            )
            return response["Table"]
            
        except Exception as e:
            self.logger.error(f"テーブル情報取得エラー: {e}")
            raise DatabaseError(f"テーブル情報の取得に失敗しました: {e}")
    
    async def health_check(self) -> bool:
        """ヘルスチェック"""
        try:
            await self.describe_table()
            return True
        except Exception:
            return False
    
    # =====================================
    # 内部ヘルパーメソッド
    # =====================================
    
    def _serialize_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """アイテムをDynamoDB保存用に変換"""
        return json.loads(json.dumps(item, default=self._json_serializer), parse_float=Decimal)
    
    def _serialize_expression_values(self, values: Dict[str, Any]) -> Dict[str, Any]:
        """式の値をDynamoDB用に変換"""
        return {k: self._serialize_value(v) for k, v in values.items()}
    
    def _serialize_value(self, value: Any) -> Any:
        """単一値をDynamoDB用に変換"""
        if isinstance(value, float):
            return Decimal(str(value))
        elif isinstance(value, datetime):
            return to_jst_string(value)
        return value
    
    def _deserialize_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """DynamoDBアイテムを通常の型に変換"""
        if not item:
            return item
        
        def convert_decimal(obj):
            if isinstance(obj, Decimal):
                return int(obj) if obj % 1 == 0 else float(obj)
            elif isinstance(obj, dict):
                return {k: convert_decimal(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_decimal(item) for item in obj]
            return obj
        
        return convert_decimal(item)
    
    def _json_serializer(self, obj: Any) -> Any:
        """JSON シリアライザ"""
        if isinstance(obj, datetime):
            return to_jst_string(obj)
        elif isinstance(obj, Decimal):
            return float(obj)
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    def _encode_pagination_token(self, last_key: Dict[str, Any]) -> str:
        """ページネーショントークンエンコード"""
        import base64
        token_data = json.dumps(last_key, default=str)
        return base64.b64encode(token_data.encode()).decode()
    
    def _decode_pagination_token(self, token: str) -> Dict[str, Any]:
        """ページネーショントークンデコード"""
        import base64
        try:
            token_data = base64.b64decode(token.encode()).decode()
            return json.loads(token_data)
        except Exception as e:
            self.logger.warning(f"無効なページネーショントークン: {token}")
            raise ValueError(f"無効なページネーショントークンです: {e}")