● Homebiyori バックエンドサービス環境変数定義書

  最終更新: 2025年1月
  対象環境: Production
  改修方針: 実処理で使用する環境変数のみに厳選

  ---
  📋 環境変数定義一覧

  1. user-service

  機能: ユーザープロフィール管理
  Lambda設定: 256MB, 30秒, common layer

  | 環境変数名           | 必須/任意 | 用途                           | 値の例                  |       
  |-----------------|-------|------------------------------|----------------------|
  | CORE_TABLE_NAME | 必須    | ユーザープロフィールデータのDynamoDBテーブル名  |
  prod-homebiyori-core |
  | ENVIRONMENT     | 必須    | FastAPI docs制御（本番環境でdocs無効化） | prod                 |       

  総数: 2個

  ---
  2. chat-service

  機能: AIチャット・会話履歴管理
  Lambda設定: 512MB, 60秒, common layer

  | 環境変数名             | 必須/任意 | 用途                           | 値の例
       |
  |-------------------|-------|------------------------------|----------------------------|
  | CORE_TABLE_NAME   | 必須    | ユーザー設定・木統計のDynamoDBテーブル名     |
  prod-homebiyori-core       |
  | CHATS_TABLE_NAME  | 必須    | チャット履歴のDynamoDBテーブル名         | prod-homebiyori-chats      
       |
  | FRUITS_TABLE_NAME | 必須    | 実データのDynamoDBテーブル名           | prod-homebiyori-fruits       
     |
  | ENVIRONMENT       | 必須    | FastAPI docs制御（本番環境でdocs無効化） | prod
       |
  | TREE_SERVICE_URL  | 必須    | 木の成長処理用HTTP通信URL             |
  https://api.homebiyori.com |

  総数: 5個

  ---
  3. tree-service

  機能: 木の成長・実管理
  Lambda設定: 256MB, 30秒, common layer

  | 環境変数名             | 必須/任意 | 用途                           | 値の例
   |
  |-------------------|-------|------------------------------|------------------------|
  | CORE_TABLE_NAME   | 必須    | 木統計データのDynamoDBテーブル名         | prod-homebiyori-core       
   |
  | FRUITS_TABLE_NAME | 必須    | 実データのDynamoDBテーブル名           | prod-homebiyori-fruits |     
  | ENVIRONMENT       | 必須    | FastAPI docs制御（本番環境でdocs無効化） | prod
   |

  総数: 3個

  ---
  4. health-check-service

  機能: ヘルスチェック・システム監視
  Lambda設定: 128MB, 10秒, layers なし

  | 環境変数名       | 必須/任意 | 用途                           | 値の例  |
  |-------------|-------|------------------------------|------|
  | ENVIRONMENT | 必須    | FastAPI docs制御（本番環境でdocs無効化） | prod |

  総数: 1個

  ---
  5. notification-service

  機能: アプリ内通知管理
  Lambda設定: 256MB, 30秒, common layer

  | 環境変数名           | 必須/任意 | 用途                           | 値の例                  |       
  |-----------------|-------|------------------------------|----------------------|
  | CORE_TABLE_NAME | 必須    | 通知データのDynamoDBテーブル名          | prod-homebiyori-core |        
  | ENVIRONMENT     | 必須    | FastAPI docs制御（本番環境でdocs無効化） | prod                 |       

  総数: 2個

  ---
  6. billing-service

  機能: Stripe決済・サブスクリプション管理
  Lambda設定: 256MB, 30秒, common layer

  | 環境変数名                    | 必須/任意 | 用途                           | 値の例
                   |
  |--------------------------|-------|------------------------------|------------------------------     
  ---|
  | CORE_TABLE_NAME          | 必須    | ユーザー課金状態のDynamoDBテーブル名       |
  prod-homebiyori-core            |
  | FEEDBACK_TABLE_NAME      | 必須    | 解約理由保存のDynamoDBテーブル名         |
  prod-homebiyori-feedback        |
  | STRIPE_API_KEY_PARAMETER | 必須    | Stripe APIキーのSSMパラメータ名       |
  /prod/homebiyori/stripe/api_key |
  | ENVIRONMENT              | 必須    | FastAPI docs制御（本番環境でdocs無効化） | prod
                   |
  | FRONTEND_URL             | 必須    | Stripe決済成功/キャンセルURL生成用       |
  https://homebiyori.com          |

  総数: 5個

  ---
  7. admin-service

  機能: 管理者ダッシュボード・システム管理
  Lambda設定: 512MB, 30秒, common layer

  | 環境変数名               | 必須/任意 | 用途                           | 値の例
       |
  |---------------------|-------|------------------------------|--------------------------|
  | CORE_TABLE_NAME     | 必須    | ユーザーデータのDynamoDBテーブル名        |
  prod-homebiyori-core     |
  | CHATS_TABLE_NAME    | 必須    | チャット分析用DynamoDBテーブル名         |
  prod-homebiyori-chats    |
  | FRUITS_TABLE_NAME   | 必須    | 実データ分析用DynamoDBテーブル名         |
  prod-homebiyori-fruits   |
  | FEEDBACK_TABLE_NAME | 必須    | フィードバック管理用DynamoDBテーブル名      |
  prod-homebiyori-feedback |
  | PAYMENTS_TABLE_NAME | 必須    | 決済履歴分析用DynamoDBテーブル名         |
  prod-homebiyori-payments |
  | ENVIRONMENT         | 必須    | FastAPI docs制御（本番環境でdocs無効化） | prod
       |

  総数: 6個

  ---
  8. contact-service

  機能: お問い合わせ処理・SNS通知
  Lambda設定: 256MB, 30秒, common layer

  | 環境変数名         | 必須/任意 | 用途                           | 値の例
                                              |
  |---------------|-------|------------------------------|-----------------------------------------     
  ------------------------------|
  | SNS_TOPIC_ARN | 必須    | 運営者通知用SNSトピックARN             |
  arn:aws:sns:ap-northeast-1:xxxx:prod-homebiyori-contact-notifications |
  | ENVIRONMENT   | 必須    | FastAPI docs制御（本番環境でdocs無効化） | prod
                                              |

  総数: 2個

  ---
  9. Stripe Webhook Services

  9-1. handle-payment-succeeded

  機能: Stripe決済成功イベント処理
  Lambda設定: 256MB, 30秒, common layer

  | 環境変数名               | 必須/任意 | 用途                       | 値の例
   |
  |---------------------|-------|--------------------------|--------------------------|
  | CORE_TABLE_NAME     | 必須    | ユーザー課金状態更新用DynamoDBテーブル名 | prod-homebiyori-core     
       |
  | PAYMENTS_TABLE_NAME | 必須    | 決済履歴保存用DynamoDBテーブル名     | prod-homebiyori-payments     
   |

  9-2. handle-payment-failed

  機能: Stripe決済失敗イベント処理
  Lambda設定: 256MB, 30秒, common layer

  | 環境変数名               | 必須/任意 | 用途                       | 値の例
   |
  |---------------------|-------|--------------------------|--------------------------|
  | CORE_TABLE_NAME     | 必須    | ユーザー課金状態更新用DynamoDBテーブル名 | prod-homebiyori-core     
       |
  | PAYMENTS_TABLE_NAME | 必須    | 決済履歴保存用DynamoDBテーブル名     | prod-homebiyori-payments     
   |

  9-3. handle-subscription-updated

  機能: Stripeサブスクリプション更新イベント処理
  Lambda設定: 256MB, 30秒, common layer

  | 環境変数名           | 必須/任意 | 用途                       | 値の例                  |
  |-----------------|-------|--------------------------|----------------------|
  | CORE_TABLE_NAME | 必須    | ユーザー課金状態更新用DynamoDBテーブル名 | prod-homebiyori-core |       

  Webhook総数: handle-payment-succeeded (2個), handle-payment-failed (2個),
  handle-subscription-updated (1個)

  ---
  📊 統計サマリー

  | サービス                 | 環境変数数 | 主要なテーブル                                 |
  |----------------------|-------|-----------------------------------------|
  | user-service         | 2個    | core                                    |
  | chat-service         | 5個    | core, chats, fruits                     |
  | tree-service         | 3個    | core, fruits                            |
  | health-check-service | 1個    | なし                                      |
  | notification-service | 2個    | core                                    |
  | billing-service      | 5個    | core, feedback                          |
  | admin-service        | 6個    | core, chats, fruits, feedback, payments |
  | contact-service      | 2個    | なし（SNS使用）                               |

  総計: 26個の環境変数（重複除く実質12種類）

  ---
  🎯 設計原則

  ✅ 採用した原則

  1. 実処理ベース: 実際にコードで使用する環境変数のみ定義
  2. 不要変数削除: 機能フラグ、オプション設定等は完全削除
  3. テーブル分離: サービスごとに必要なDynamoDBテーブルのみアクセス
  4. 統一性確保: TerraformとLambdaコードで環境変数定義を完全一致

  ❌ 削除した不要な設定

  - 機能フラグ類（全サービス）
  - 未使用DynamoDBテーブル参照
  - オプション設定項目
  - 内部API認証設定
  - レート制限・セキュリティ設定

  ---
  🔧 運用・保守指針

  環境変数追加時のチェックリスト

  1. 実処理確認: コードで実際に使用されているか
  2. Terraform定義: infrastructure/environments/prod/backend/main.tf に追加
  3. コード設定: 各サービスのconfig.pyに追加（設定クラスがある場合）
  4. テスト確認: 環境変数が正しく読み込まれるかテスト
  5. ドキュメント更新: 本ドキュメントの更新

  セキュリティ考慮事項

  - 機密情報: SSM Parameter Store経由での取得（例: STRIPE_API_KEY_PARAMETER）
  - ARN参照: TerraformのOutput経由での動的取得
  - 環境分離: 本番/開発環境での適切な値設定

  ---
  🌟 改修効果

  Before（改修前）

  - user-service: 14個の設定項目 → 87%削減
  - notification-service: 20個の設定項目 → 90%削減
  - contact-service: 18個の設定項目 → 89%削減

  After（改修後）

  - 可読性向上: 必要最小限の設定のみ
  - エラー削減: 未使用環境変数によるランタイムエラー排除
  - 保守性向上: 新規開発者の理解容易性向上
  - 一貫性確保: インフラとコードの環境変数定義完全同期

  ---
  このドキュメントは実処理ベースでの環境変数精査の結果を反映した最終版です。