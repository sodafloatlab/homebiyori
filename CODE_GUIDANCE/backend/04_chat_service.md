### バックエンド学習ガイド: 04. chat_service

`chat_service`は、Homebiyoriアプリケーションの**核となるAIとの対話機能**を提供するサービスです。ユーザーがAIキャラクターと自然な会話を交わし、褒め言葉を受け取る体験を支えます。

このサービスは、これまでの`user_service`や`tree_service`と比較して、**生成AI（LLM）との連携**や**会話履歴の管理（メモリ）**といった、より高度で複雑な技術要素を含んでいます。LangChainのようなフレームワークを活用し、ユーザーの入力から適切なAI応答を生成する役割を担います。

---

## ファイル解説

### 1. `models.py` の解説

このファイルは、AIとのチャット機能における**リクエスト・レスポンスのデータ構造**、そして**チャット履歴の永続化モデル**を定義しています。特に、複数のAIキャラクターとの対話や、感情検出といった、このサービスならではの機能に対応したモデルが特徴です。

(中略... `models.py`の解説 ...)

### 2. `database.py` の解説

このファイルは、`chat_service`におけるチャットメッセージの保存、取得、そしてAIとの対話に関連する様々なデータの永続化を担っています。

`user_service`や`tree_service`の`database.py`と同様に、`main.py`からの指示を受けてDynamoDBを操作しますが、チャット履歴の特性（大量データ、TTL管理、S3連携）に対応した、より複雑なロジックが含まれています。

#### `__init__(self)` - 複数テーブルへの対応

*   このサービスでは、責務に応じて`core_client`, `chats_client`, `fruits_client`の3つの`DynamoDBClient`インスタンスを初期化し、それぞれ異なるテーブルを操作します。

#### チャットメッセージ管理

*   **`save_chat_message`**: チャットメッセージを`chats`テーブルに保存します。`PK=USER#{user_id}`, `SK=CHAT#{timestamp}#{message_id}`という複合キーを使い、時系列での管理を可能にしています。また、キャラクター別の検索を効率化するためのGSI（グローバルセカンダリインデックス）用のフィールドも同時に設定します。
*   **`get_chat_history`**: GSIやSKの範囲クエリを駆使して、キャラクター別や期間指定での柔軟なチャット履歴検索を実現します。
*   **`get_recent_chat_context`**: AIが応答を生成する際に、直近の会話の文脈を読み込むためのメソッドです。

#### TTL管理

*   **`calculate_message_ttl`**: ユーザーのサブスクリプションプランに応じて、チャット履歴の保持期間（30日または180日）を計算し、DynamoDBのTTL属性に設定するためのUNIXタイムスタンプを返します。

#### 他サービスへの移譲

*   木の成長や実の管理、ユーザー情報の取得といった、このサービスが直接の責任を持たない処理は、それぞれ`tree_service`や`user_service`にHTTPクライアント経由で問い合わせる形になっており、マイクロサービスとして責務が明確に分離されています。

### 3. `langchain_memory.py` の解説

このファイルは、LLMが過去の会話を「記憶」し、文脈に沿った応答を返すための、**会話履歴管理（メモリ）**の仕組みを実装しています。

#### なぜこのファイルが必要か？

LLMは本質的にステートレスであり、単体では過去のやり取りを覚えていません。自然な会話を実現するには、新しいメッセージを送るたびに、これまでの会話履歴を一緒に渡してあげる必要があります。LangChainのMemoryコンポーネントは、このプロセスを自動化するための仕組みであり、このファイルはそれを私たちのDynamoDBと連携させるためのカスタム実装です。

#### 主要なクラスの役割分担

*   **`DynamoDBChatMessageHistory`クラス (現場作業員)**: `database.py`を使い、DynamoDBと直接やり取りして、特定の会話のメッセージを読み書きする専門家です。LangChainが理解できるメッセージ形式（`HumanMessage`, `AIMessage`）への変換も担当します。
*   **`HomebiyoriConversationMemory`クラス (マネージャー)**: `DynamoDBChatMessageHistory`を部下として使い、会話全体の文脈を管理します。LangChainの`ConversationSummaryBufferMemory`という高度な記憶術を使い、長すぎる会話は自動で要約しつつ、直近の会話はそのまま保持し、最終的にAIに渡すための「申し送り事項（プロンプト）」を組み立てます。

#### 連携フロー

1.  **`langchain_ai.py`**が`HomebiyoriConversationMemory`（マネージャー）を生成します。
2.  マネージャーは初期化時に`DynamoDBChatMessageHistory`（現場作業員）を準備します。
3.  AI応答生成の前に、マネージャーは現場作業員に指示を出し、DynamoDBから会話履歴を取得・整形させます。
4.  AI応答が完了した後、マネージャーは現場作業員に指示を出し、新しいやり取りをDynamoDBに保存させます。

このように、各クラスが明確な役割分担を持ち、連携することで、単なるチャットボットではない、「文脈を理解する」という高度なAI対話機能を実現しています。


╭────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│  > chat_serviceのlangchain_memoryの解説を行いなさい。特に各クラスやメソッド間の繋がりが複雑なので重点的に  │
│    解説し、関係性を正しく認識できるようにしなさい。                                                        │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

✦ はい、承知いたしました。chat_serviceの中でも特に重要な、langchain_memory.pyについて解説します。

  ご指摘の通り、このファイルは複数のクラスやメソッドが連携して「会話の記憶」という機能を実現しているため、そ
  の繋がりと役割分担に重点を置いて、関係性が正しく認識できるよう解説を進めます。

  まず、langchain_memory.pyのコード全体を確認します。

 ╭────────────────────────────────────────────────────────╮
 │ ✔  ReadFile ...ckend\chat_service\langchain_memory.py  │
 ╰────────────────────────────────────────────────────────╯
✦ langchain_memory.pyのコードを読み込みました。
  ご指摘の通り、このファイルは複数のクラスが連携して「会話の記憶」という機能を実現しているため、その繋がりと役
  割分担に重点を置いて、関係性が正しく認識できるよう解説を進めます。

  なぜこのファイルが必要か？ - LLMの「記憶」問題

  まず、このファイルの存在理由です。ChatGPTのような大規模言語モデル（LLM）は、それ自体では状態（ステート）を
  持たず、過去の会話を覚えていません。毎回新しいリクエストのたびに、すべての文脈をゼロから理解する必要があり
  ます。

  自然な会話を続けるためには、過去のやり取り（例：「昨日の公園、楽しかったね」→「そうだね、砂場で遊んだのが特
  にね」）を、新しいリクエストのたびにLLMに教えてあげる必要があります。

  LangChainのMemoryコンポーネントは、この「会話履歴の管理とプロンプトへの自動的な組み込み」を簡単に行うための
  仕組みです。そして、このlangchain_memory.pyは、その仕組みを私たちのDynamoDBテーブルと連携させるために作られ
  た、カスタム実装です。

  登場人物の紹介 - 各クラスの役割分担

  このファイルには、主に2つの重要なクラスが登場します。それぞれの役割を、会社組織に例えてみましょう。

   1. `DynamoDBChatMessageHistory`クラス:
       * 役割: 現場作業員
       * 仕事内容: ChatServiceDatabase（道具箱）を使い、DynamoDBと直接やり取りして、特定の会話のメッセージを読
         み書きする専門家です。LangChainが理解できるメッセージ形式（HumanMessage,
         AIMessage）への変換も担当します。

   2. `HomebiyoriConversationMemory`クラス:
       * 役割: マネージャー
       * 仕事内容: DynamoDBChatMessageHistory（現場作業員）を部下として使い、会話全体の文脈を管理します。LangCh
         ainのConversationSummaryBufferMemoryという高度な記憶術を使い、長すぎる会話は自動で要約しつつ、直近の会
         話はそのまま保持し、最終的にAI（LLM）に渡すための「申し送り事項（プロンプト）」を組み立てます。

  クラス・メソッド間の連携フロー

  ユーザーが新しいメッセージを送信した際の、内部的な処理の流れを追ってみましょう。

   1. `langchain_ai.py` (司令部):
       * AI応答を生成するため、まずcreate_conversation_memory(user_id,
         ...)を呼び出して、メモリ管理の担当マネージャーを準備します。

   2. `create_conversation_memory()` (ファクトリー):
       * HomebiyoriConversationMemoryのインスタンス（マネージャー）を生成して返します。

   3. `HomebiyoriConversationMemory.__init__()` (マネージャーの着任):
       * マネージャーは着任すると、まず自分の部下を準備します。
           * self.chat_history = DynamoDBChatMessageHistory(...) を呼び出し、現場作業員を生成します。
       * 次に、LangChainの高度な記憶術であるConversationSummaryBufferMemoryを、この現場作業員(self.chat_history
         )と連携させて初期化します。これで、マネージャーは記憶を管理する準備が整いました。

   4. `langchain_ai.py` (司令部):
       * マネージャー（HomebiyoriConversationMemoryのインスタンス）に、「過去の会話の要約をくれ」と依頼します。
       * context = memory.get_conversation_context()

   5. `get_conversation_context()` (マネージャーの仕事):
       * マネージャーは、LangChainの記憶術（self.memory）に「メモリをロードしてくれ」と頼みます
         (self.memory.load_memory_variables({}))。
       * この命令がトリガーとなり、３で整理した情報を取得する。

   6. `langchain_ai.py` (司令部):
       * 司令部は、マネージャーから受け取った会話履歴（context）と、ユーザーからの新しいメッセージを組み合わせ
         て、最終的なプロンプトを作成し、AIに送信します。

   7. AI応答後:
       * 司令部は、今回のやり取り（ユーザーのメッセージとAIの応答）を記憶させるため、マネージャーにmemory.save_
         context(...)のような形で指示を出します。
       * マネージャーは、その指示を現場作業員に伝え、現場作業員がdatabase.pyのメソッドを呼び出して、新しいメッ
         セージをDynamoDBに書き込みます。

  関係性の図解

    1 [langchain_ai.py (司令部)]
    2        │
    3        └─ 1. 生成・利用
    4        ▼
    5 [HomebiyoriConversationMemory (マネージャー)]
    6        │   (LangChainの記憶術を駆使)
    7        │
    8        └─ 2. 指示
    9        ▼
   10 [DynamoDBChatMessageHistory (現場作業員)]
   11        │
   12        └─ 3. DB操作
   13        ▼
   14 [DynamoDB (記録保管庫)]

  このように、各クラスが明確な役割分担を持ち、連携することで、単なるチャットボットではない、「文脈を理解する
  」という高度なAI対話機能を実現しているのです。

### 4. `langchain_ai.py` の解説

このファイルは、`chat_service`におけるAI応答生成の司令塔です。`langchain_memory.py`で準備された「記憶」と、状況に応じた「指示書（プロンプト）」、そして「AI（LLM）」の三者を連携させ、最終的な応答を生成する役割を担います。

#### なぜこのファイルが必要か？

`langchain_memory.py`が会話の「記憶」を管理する専門家だとすれば、`langchain_ai.py`は、その記憶を使って実際に「会話する」専門家です。ユーザーからの入力、キャラクター設定、対話モード（褒める/聞く）といった様々な要素を統合し、AIに対して最も的確な指示を出すためのロジックがここに集約されています。

#### 主要なクラスとメソッドの関係

このモジュールの中心は`HomebiyoriAIChain`クラスです。各メソッドが連携してAIの応答を生成します。

```mermaid
graph TD
    A[外部API: generate_ai_response_langchain] --> B{get_ai_chain (Singleton)}
    B --> C[HomebiyoriAIChain インスタンス]
    C --> D{generate_response}

    subgraph "応答生成プロセス"
        D --> E[1. create_conversation_memory<br>(会話履歴をロード)]
        D --> F[2. _get_llm<br>(Bedrockモデルを準備)]
        D --> G[3. _build_prompt_template<br>(プロンプトを動的に構築)]
        D --> H[4. ConversationChain<br>(LLM, メモリ, プロンプトを統合)]
        H --> I[5. chain.ainvoke<br>(AIに応答生成を指示)]
        I --> J[6. _validate_response_quality<br>(応答の品質をチェック)]
    end

    J --> K[最終的なAI応答]
    A -- 引数 --> D
    K -- 返り値 --> A

    subgraph "初期化時"
        L[HomebiyoriAIChain.__init__] --> M[_load_prompt_templates<br>(全プロンプトをファイルからキャッシュ)]
    end

    C -.-> L
```

#### `HomebiyoriAIChain` クラスの役割

AIとの会話ロジック全体を管理します。

-   **`__init__(self)` / `_load_prompt_templates(self)`**:
    -   **役割**: 初期化時に、ファイルシステム (`.kiro/specs/homebi-yori/prompt/`配下) からキャラクターや状況別のプロンプト定義（`.md`ファイル）をすべて読み込み、メモリにキャッシュします。これにより、応答生成のたびにファイルを読み込むオーバーヘッドをなくします。

-   **`_get_llm(self)`**:
    -   **役割**: AWS Bedrockに接続するための`ChatBedrock`クライアントを準備します。
    -   **連携**: `homebiyori_common`レイヤーの関数を呼び出し、AWS Parameter StoreからモデルIDやリージョンなどの設定を取得します。一度生成したクライアントはキャッシュされ、再利用されます。

-   **`_build_prompt_template(self, ...)`**:
    -   **役割**: 対話の状況（キャラクター、ムード、グループチャットの有無など）に応じて、最適なプロンプトを動的に組み立てます。
    -   **連携**: `__init__`でキャッシュしたプロンプトをベースに、会話履歴 (`{history}`) とユーザーの最新の入力 (`{input}`) を埋め込むためのLangChain `PromptTemplate`オブジェクトを生成します。グループチャートの場合は、他のキャラクターとの応答の重複を避けるための特別な指示を追加します。

-   **`async generate_response(self, ...)`**:
    -   **役割**: AI応答を生成する一連の流れを制御する中核メソッドです。
    -   **連携**:
        1.  まず`create_conversation_memory`を呼び出し、S3からこのユーザーとの過去の会話履歴をロードします。
        2.  次に`_get_llm`と`_build_prompt_template`を呼び出し、LLMクライアントとプロンプトを準備します。
        3.  これら3つの要素（LLM、メモリ、プロンプト）を`ConversationChain`に集約します。
        4.  `chain.ainvoke()`を非同期で呼び出し、Bedrockにリクエストを送信してAIの応答を取得します。
        5.  最後に`_validate_response_quality`で応答を検証し、問題がなければそのテキストを返します。エラー発生時は`_get_fallback_response`が固定のメッセージを返します。

#### トップレベル関数の役割

-   **`get_ai_chain()`**:
    -   **役割**: `HomebiyoriAIChain`クラスのインスタンスをシングルトン（アプリケーション全体で一つだけ）として管理します。これにより、重い初期化処理（プロンプトの全読み込みなど）が一度しか実行されないことを保証します。

-   **`async generate_ai_response_langchain(...)`**:
    -   **役割**: このモジュールの機能を外部（API Gatewayのハンドラなど）に提供するエントリーポイントです。
    -   **連携**: `get_ai_chain()`でインスタンスを取得し、その`generate_response`メソッドを呼び出すだけのシンプルなラッパー関数です。

このように、各クラス・メソッドが明確な責務を持ち連携することで、単なる定型応答ではない、状況に応じた柔軟で自然なAIとの対話を実現しています。

### 5. `http_client.py` の解説

`http_client.py`は、`chat_service`が他のマイクロサービス（`user_service`, `tree_service`, `billing_service`）とHTTP通信を行うためのクライアントを実装しています。マイクロサービスアーキテクチャにおいて、各サービスが自身の責務に集中しつつ、必要な情報を他の専門サービスから取得するための重要な役割を担います。

#### 目的と役割

-   **サービス間通信の抽象化**: 他のサービスへのHTTPリクエストの詳細（URL構築、ヘッダー設定、エラーハンドリングなど）をカプセル化し、`chat_service`のメインロジックから分離します。
-   **コードの重複排除**: 各サービスへの呼び出しロジックを一箇所にまとめることで、コードの重複を防ぎ、保守性を高めます。
-   **疎結合の促進**: `chat_service`が他のサービスの内部実装に依存せず、APIインターフェースのみに依存することで、サービス間の疎結合を維持します。

#### 主要なクラスと関数

##### `ServiceHTTPClient` クラス

このファイルの中核となるクラスで、他のサービスへのHTTPリクエストを管理します。

-   **`__init__(self)`**:
    -   **役割**: `ServiceHTTPClient`インスタンスを初期化します。
    -   **処理内容**:
        -   `user_service`, `tree_service`, `billing_service`のベースURLを環境変数から取得し、`self.base_urls`辞書に格納します。環境変数が設定されていない場合は、デフォルトで`http://localhost:8001`や`http://localhost:8002`などが使用され、ローカル開発環境でのテストを容易にしています。
        -   HTTPリクエストのタイムアウト値を`30.0`秒に設定します。

-   **`async _make_request(...)` メソッド (プライベート)**:
    -   **役割**: 実際のHTTPリクエストを実行する汎用的な非同期プライベートメソッドです。
    -   **処理内容**:
        -   `httpx.AsyncClient`を使用して非同期HTTPリクエストを送信します。
        -   指定された`method`（GET, POST, PUT）に応じて適切なHTTPメソッドを呼び出します。
        -   レスポンスのステータスコードがエラー（4xx, 5xx）の場合、`response.raise_for_status()`で例外を発生させます。
        -   `httpx.TimeoutException`（タイムアウト）、`httpx.HTTPStatusError`（HTTPエラー）、その他の`Exception`を捕捉し、適切なエラーログを出力した上で、より具体的な例外を再発生させます。これにより、呼び出し元でエラーの種類を判別しやすくなります。

##### 各サービス呼び出しメソッド

`_make_request`メソッドを内部的に利用し、特定のサービスのエンドポイントを呼び出すためのラッパーメソッド群です。各メソッドは、呼び出し元の`chat_service`が期待する形式にレスポンスを変換する役割も担います。

-   **User Service 呼び出し**:
    -   `async get_user_subscription_info(self, user_id: str)`: `user_service`の`/api/user/subscription-status`エンドポイントを呼び出し、ユーザーのサブスクリプション情報を取得します。エラー発生時はデフォルト値（`free`プラン、`active`ステータス）を返します。
    -   `async get_user_ai_preferences(self, user_id: str)`: `user_service`の`/api/user/profile`エンドポイントを呼び出し、ユーザーのAI設定（キャラクター、褒めレベル、対話モード）を取得します。エラー発生時はデフォルト設定を返します。
    -   `async update_user_interaction_mode(self, user_id: str, interaction_mode: str, user_note: Optional[str] = None)`: `user_service`の`/api/user/interaction-mode`エンドポイントを呼び出し、ユーザーの対話モードを更新します。

-   **Tree Service 呼び出し**:
    -   `async get_user_tree_stats(self, user_id: str)`: `tree_service`の`/api/tree/status`エンドポイントを呼び出し、ユーザーの木の成長統計（累計文字数、現在の段階など）を取得します。エラー発生時はデフォルト値（すべて0）を返します。
    -   `async update_tree_stats(self, user_id: str, added_characters: int)`: `tree_service`の`/api/tree/growth`エンドポイントを呼び出し、木の成長を更新します。
    -   `async save_fruit_info(self, user_id: str, fruit_info: FruitInfo)`: `tree_service`の`/api/tree/fruits`エンドポイントを呼び出し、実（褒めメッセージ）の情報を保存します。
    -   `async can_generate_fruit(self, user_id: str)`: `tree_service`の`/api/tree/can-generate-fruit`エンドポイントを呼び出し、実の生成が可能かどうか（1日1回制限など）を判定します。エラー発生時は`False`を返します（安全側に倒す）。

-   **Billing Service 呼び出し**:
    -   `async check_user_access_control(self, user_id: str)`: `billing_service`の`/api/billing/access-control`エンドポイントを呼び出し、ユーザーのアクセス制御状態（有料プランへのアクセス可否など）をチェックします。エラー発生時はアクセス拒否のデフォルト情報を返します（安全側に倒す）。

##### `get_service_http_client()` 関数 (ファクトリー関数)

-   **役割**: `ServiceHTTPClient`クラスのシングルトンインスタンスを提供します。
-   **処理内容**: グローバル変数`_http_client_instance`をチェックし、インスタンスがまだ存在しない場合にのみ新しく作成します。これにより、アプリケーション全体で`ServiceHTTPClient`のインスタンスが一つだけになり、リソースの効率的な利用と、HTTPクライアントの再利用によるパフォーマンス向上が図られます。

#### クラス・メソッド間の連携

`chat_service`のメインロジック（`main.py`など）は、`get_service_http_client()`を呼び出して`ServiceHTTPClient`のインスタンスを取得します。その後、そのインスタンスが提供する各サービス呼び出しメソッド（例: `client.get_user_ai_preferences(user_id)`)を呼び出すことで、他のサービスと連携します。

各サービス呼び出しメソッドは、内部で`_make_request`を呼び出し、実際のHTTP通信を行います。`_make_request`は`httpx`ライブラリを利用して非同期にリクエストを処理し、エラーハンドリングも行います。

この設計により、`chat_service`は自身の主要な責務であるAIチャット機能に集中でき、ユーザー情報や木の成長情報、課金情報といった他のドメインの知識は、それぞれの専門サービスに問い合わせることで取得します。これは、マイクロサービスアーキテクチャの「関心の分離」と「疎結合」という原則を体現しています。


  
