# AWS Lambdaハンドラ (handler.py)
#
# ■役割
# このファイルは、AWS Lambdaが実行する際の最初のエントリーポイント(入り口)です。
# Lambdaからのリクエストを受け取り、FastAPIアプリケーションに渡す「通訳」の役割を担います。
#
# ■Mangumライブラリ
# Lambdaのリクエスト形式と、FastAPIが標準とするWebのリクエスト形式は異なります。
# Mangumは、その形式の違いを吸収してくれる便利なライブラリです。
# これにより、FastAPIアプリケーションのコードを一切変更することなく、Lambda上で動かせます。

from mangum import Mangum

# 同じディレクトリにあるmain.pyから、FastAPIアプリケーション本体(app)をインポートします。
from .main import app

# Mangumを使って、FastAPIアプリをLambdaで処理できる形式に変換します。
# Lambdaが実行されると、この「handler」が呼び出されます。
handler = Mangum(app)
