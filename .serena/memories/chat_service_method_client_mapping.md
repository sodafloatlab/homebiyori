# Chat Service メソッド別クライアント使用分析

## 各メソッドのデータアクセス分析

以下の分析に基づいて、各メソッドで適切なクライアントを使用する：

### 1. Chatsテーブル（TTL管理されたチャット履歴）
- `save_chat_message` - チャット履歴保存 → `self.chats_client`
- `get_chat_history` - チャット履歴取得 → `self.chats_client`  
- `get_recent_chat_context` - 最近のチャット文脈取得 → `self.chats_client`

### 2. Fruitsテーブル（永続保存される実の情報）
- `save_fruit_info` - 実（褒めメッセージ）情報保存 → `self.fruits_client`
- `get_last_fruit_date` - 最後の実生成日時取得 → `self.fruits_client`

### 3. Coreテーブル（ユーザープロフィール、サブスクリプション、木統計、AI設定）
- `get_user_tree_stats` - 木の統計取得（PK: USER#{user_id}, SK: TREE） → `self.core_client`
- `update_tree_stats` - 木の統計更新（PK: USER#{user_id}, SK: TREE） → `self.core_client`
- `get_user_subscription_info` - サブスクリプション情報取得（PK: USER#{user_id}, SK: SUBSCRIPTION） → `self.core_client`
- `get_user_ai_preferences` - AI設定取得（PK: USER#{user_id}, SK: PROFILE） → `self.core_client`
- `update_user_mood` - ユーザー気分更新（PK: USER#{user_id}, SK: CHAT_SETTINGS） → `self.core_client`
- `save_emotion_stamp` - 感情スタンプ保存（PK: USER#{user_id}, SK: EMOTION#） → `self.core_client`
- `increment_character_usage` - キャラクター使用統計更新（PK: USER#{user_id}, SK: CHAR_STATS#） → `self.core_client`
- `increment_emotion_detection` - 感情検出統計更新（PK: USER#{user_id}, SK: EMOTION_STATS#） → `self.core_client`
- `record_stage_change` - 成長段階変化記録（PK: USER#{user_id}, SK: STAGE_CHANGE#） → `self.core_client`

## 修正対象のself.db_client使用箇所

```
行149: save_chat_message → self.chats_client
行240: get_chat_history (GSI検索) → self.chats_client
行250: get_chat_history (prefix検索) → self.chats_client
行353: get_recent_chat_context → self.chats_client
行426: get_user_tree_stats → self.core_client
行511: update_tree_stats → self.core_client
行578: save_fruit_info → self.fruits_client
行622: get_last_fruit_date → self.fruits_client
行681: get_user_subscription_info → self.core_client
行739: get_user_ai_preferences → self.core_client
行867: update_user_mood → self.core_client
行929: save_emotion_stamp → self.core_client
行973: increment_character_usage (get_item) → self.core_client
行986: increment_character_usage (put_item) → self.core_client
行1017: increment_emotion_detection (get_item) → self.core_client
行1030: increment_emotion_detection (put_item) → self.core_client
行1061: record_stage_change → self.core_client
```