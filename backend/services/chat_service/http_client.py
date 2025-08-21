"""
Chat Service HTTP Client

他のマイクロサービスとの通信を担当するHTTPクライアント。
重複コード削除のため、user_serviceとtree_serviceの機能を呼び出し。
"""

import os
import json
import asyncio
from typing import Dict, Any, Optional
import httpx
from homebiyori_common.logger import get_logger
from homebiyori_common.models import FruitInfo

logger = get_logger(__name__)


class ServiceHTTPClient:
    """マイクロサービス間通信用HTTPクライアント"""
    
    def __init__(self):
        self.base_urls = {
            "tree_service": os.environ.get("TREE_SERVICE_URL", "http://localhost:8002")
            # user_service URL削除（AI設定取得不要のため）
        }
        self.timeout = 30.0  # 30秒タイムアウト
    
    async def _make_request(
        self, 
        service: str, 
        endpoint: str, 
        method: str = "GET",
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """内部リクエスト実行メソッド"""
        
        url = f"{self.base_urls[service]}{endpoint}"
        request_headers = headers or {}
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=request_headers)
                elif method.upper() == "POST":
                    response = await client.post(url, json=data, headers=request_headers)
                elif method.upper() == "PUT":
                    response = await client.put(url, json=data, headers=request_headers)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            logger.error(f"Service request timeout: {service}/{endpoint}")
            raise Exception(f"{service} service timeout")
        except httpx.HTTPStatusError as e:
            logger.error(f"Service request failed: {service}/{endpoint}, status={e.response.status_code}")
            raise Exception(f"{service} service error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Service request error: {service}/{endpoint}, error={str(e)}")
            raise Exception(f"{service} service unavailable: {str(e)}")
    
    # =====================================
    # Tree Service呼び出し
    # =====================================
    
    async def update_tree_stats(
        self, 
        user_id: str, 
        added_characters: int
    ) -> Dict[str, Any]:
        """木の成長統計更新（成長計算結果を返却）"""
        try:
            logger.debug(f"Calling tree_service for tree growth update: user_id={user_id[:8]}****")
            
            response = await self._make_request(
                service="tree_service",
                endpoint="/api/tree/update-growth",
                method="PUT",
                data={
                    "user_id": user_id,
                    "added_characters": added_characters
                }
            )
            
            logger.info(f"Tree stats updated via tree_service: user_id={user_id[:8]}****")
            
            # tree_serviceから返された成長情報を返却
            return response.get("growth_info", {})
            
        except Exception as e:
            logger.error(f"Failed to update tree stats via tree_service: {str(e)}")
            raise Exception(f"Tree service unavailable for stats update: {str(e)}")
    
    async def save_fruit_info(self, user_id: str, fruit_info: FruitInfo) -> None:
        """実情報保存"""
        try:
            logger.debug(f"Calling tree_service for fruit save: user_id={user_id[:8]}****")
            
            fruit_data = {
                "user_id": user_id,
                "user_message": fruit_info.user_message,
                "ai_response": fruit_info.ai_response, 
                "ai_character": fruit_info.ai_character.value,
                "detected_emotion": fruit_info.detected_emotion.value,
                "interaction_mode": fruit_info.interaction_mode
            }
            
            await self._make_request(
                service="tree_service",
                endpoint="/api/tree/fruits",
                method="POST",
                data=fruit_data
            )
            
            logger.info(f"Fruit saved via tree_service: user_id={user_id[:8]}****")
            
        except Exception as e:
            logger.error(f"Failed to save fruit via tree_service: {str(e)}")
            raise Exception(f"Tree service unavailable for fruit save: {str(e)}")

# =====================================
# ファクトリー関数
# =====================================

_http_client_instance = None

def get_service_http_client() -> ServiceHTTPClient:
    """
    ServiceHTTPClientインスタンスを取得（シングルトンパターン）
    
    Returns:
        ServiceHTTPClient: HTTPクライアント
    """
    global _http_client_instance
    if _http_client_instance is None:
        _http_client_instance = ServiceHTTPClient()
    return _http_client_instance