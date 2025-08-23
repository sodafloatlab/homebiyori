# アクセス制御最適化実装計画

## 提案: ハイブリッドアーキテクチャ

### Phase 1: 共通Layer DB直接アクセス実装

#### 1.1 新しいアクセス制御クライアント作成
```python
# homebiyori_common/auth/subscription_checker.py
class SubscriptionChecker:
    async def check_user_access_direct(self, user_id: str) -> Dict[str, Any]:
        """DynamoDB直接参照でアクセス制御チェック"""
        # core_tableから直接サブスクリプション状態取得
        # 高速・高可用性を実現
```

#### 1.2 アクセス制御ミドルウェア修正
```python
# access_control.py
# AccessControlClient (HTTP) → SubscriptionChecker (DB直接) に変更
```

### Phase 2: パフォーマンス最適化

#### 2.1 DynamoDBクエリ最適化
- Single Table Design活用
- GSI効率的利用
- BatchGetItem活用

#### 2.2 キャッシュ戦略
- Lambda実行コンテキスト内キャッシュ
- 短期間（30秒程度）のメモリキャッシュ

### Phase 3: billing_service責任分離

#### 3.1 責任範囲明確化
- **読み込み**: 共通Layer（高速アクセス制御）
- **書き込み**: billing_service（整合性確保）

#### 3.2 データ整合性確保
- 楽観的ロック (条件付き更新)
- billing_serviceでの原子操作

## 期待される改善効果

### パフォーマンス
- レスポンス時間: 150-300ms → 20-50ms (80%改善)
- スループット: billing_service負荷削減

### 可用性
- 単一障害点排除
- 各サービス独立動作可能

### スケーラビリティ
- 水平スケーリング対応
- DynamoDB自動スケーリング活用

## 実装優先度

### High Priority
1. SubscriptionChecker実装
2. access_control.py修正
3. パフォーマンステスト

### Medium Priority  
1. キャッシュ戦略実装
2. モニタリング強化

### Low Priority
1. 詳細メトリクス収集
2. A/Bテスト実装