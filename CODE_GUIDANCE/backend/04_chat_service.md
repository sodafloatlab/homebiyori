### バックエンド学習ガイド: 04. chat_service

`chat_service`は、Homebiyoriアプリケーションの**核となるAIとの対話機能**を提供するサービスです。ユーザーがAIキャラクターと自然な会話を交わし、褒め言葉を受け取る体験を支えます。

このサービスは、これまでの`user_service`や`tree_service`と比較して、**生成AI（LLM）との連携**や**会話履歴の管理（メモリ）**といった、より高度で複雑な技術要素を含んでいます。LangChainのようなフレームワークを活用し、ユーザーの入力から適切なAI応答を生成する役割を担います。

---

## ファイル解説

### 1. `models.py` の解説

このファイルは、AIとのチャット機能における**リクエスト・レスポンスのデータ構造**、そして**チャット履歴の永続化モデル**を定義しています。特に、複数のAIキャラクターとの対話や、感情検出といった、このサービスならではの機能に対応したモデルが特徴です。

#### 1. 共通Layerからのインポート

*   `homebiyori_common.utils.datetime_utils`: 日時処理のためのユーティリティ。
*   `homebiyori_common.models`: `AICharacterType`, `EmotionType`, `InteractionMode`, `FruitInfo`, `TreeGrowthInfo`, `AIResponse`といった、プロジェクト全体で共通して使われる列挙型やデータモデルをインポートしています。これにより、各サービスで同じ定義を繰り返すことなく、一貫性を保っています。

#### 2. リクエスト・レスポンスモデル

*   **`ChatRequest`**: 
    *   基本的なチャットメッセージ送信用のリクエストモデルです。ユーザーメッセージ、AIキャラクター、対話モード（`mood`）を指定します。
*   **`GroupChatRequest`**: 
    *   複数のAIキャラクターとの同時チャットを想定した、より複雑なリクエストモデルです。
    *   `active_characters: List[AICharacterType]`で、対話に参加させるAIキャラクターのリストを指定できます。
    *   `context_length`: 会話履歴を何件遡ってAIに渡すか、という文脈の長さを指定します。
    *   `@validator("active_characters")`: ここで独自のバリデーションが定義されています。`len(set(v)) != len(v)`というチェックで、**`active_characters`リストの中に重複するキャラクターがいないか**を確認しています。これは、Pydanticの`Field`では直接指定できない、より複雑なビジネスルールをモデルレベルで強制する良い例です。
*   **`ChatResponse` / `GroupChatResponse`**: 
    *   チャットの応答結果を返すためのモデルです。
    *   `ai_response`: AIからの応答メッセージ。
    *   `tree_growth`: `tree_service`で定義された木の成長情報。
    *   `fruit_generated` / `fruit_info`: 会話の結果、実が生成されたかどうかのフラグと、生成された実の情報。
    *   `GroupChatResponse`は、`ai_responses`がリストになっている点が`ChatResponse`と異なります。

#### 3. データ永続化モデル

*   **`ChatMessage`**: 
    *   チャット履歴をDynamoDBに保存するためのモデルです。
    *   `user_message_s3_key` / `ai_response_s3_key`: 実際のメッセージ本文はS3に保存され、ここにはそのS3キーが格納される設計になっています。これは、DynamoDBのアイテムサイズ制限（400KB）を超えないようにするための工夫です。
    *   `emotion_detected` / `emotion_score`: 感情分析の結果を保存します。
    *   `character_count`: メッセージの文字数。木の成長計算に利用されます。
    *   `tree_stage_before` / `tree_stage_after`: 会話の前後での木の成長段階を記録します。
    *   `ttl`: DynamoDBのTTL（Time To Live）機能を利用して、一定期間後にメッセージを自動削除するためのタイムスタンプ。
    *   `character_date`: GSI（グローバルセカンダリインデックス）のキーとして使われる可能性のあるフィールドで、特定のキャラクターとのチャット履歴を日付で検索する際に利用されます。

#### 4. その他のリクエスト・レスポンスモデル

*   **`ChatHistoryRequest` / `ChatHistoryResponse`**: チャット履歴を取得するためのモデルです。日付やキャラクターによるフィルター、ページネーションに対応しています。
*   **`MoodUpdateRequest`**: ユーザーがAIとの対話モード（褒めモード/傾聴モード）を動的に変更するためのリクエストです。
*   **`EmotionStampRequest`**: ユーザーが感情アイコンをタップしてメッセージを送る機能（「無言でもいい相談」）のためのリクエストです。

### まとめ

`chat_service/models.py`は、AIとの対話という複雑な機能を実現するために、多岐にわたるデータモデルを定義しています。特に、外部サービス（S3）との連携、感情分析結果の保持、木の成長との連動、そして会話履歴のTTL管理といった、このアプリケーションならではの要件が色濃く反映されています。
