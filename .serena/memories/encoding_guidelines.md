# 文字エンコーディングガイドライン

## 問題の概要
Windows開発環境でのPythonコンソール出力がcp932（Shift_JIS）を使用するため、Unicode特殊文字（✓✗❌など）でエンコーディングエラーが発生。

## 影響範囲
- **本番環境**: 影響なし（AWS LambdaはUTF-8デフォルト）
- **開発環境**: テスト用print文のみで発生
- **実装コード**: 影響なし（特殊文字未使用）

## 対応ガイドライン

### 1. ログ出力での推奨事項
```python
# ❌ 避けるべき（Windows環境でエラー）
logger.info("✓ 処理完了")

# ✅ 推奨（ASCII文字のみ）
logger.info("SUCCESS: 処理完了")
logger.info("OK: Processing completed")
logger.info("COMPLETED: Task finished")
```

### 2. テスト出力での推奨事項
```python
# ❌ 避けるべき
print("✓ テスト合格")

# ✅ 推奨
print("OK: テスト合格")
print("SUCCESS: Test passed")
print("[PASS] Test completed")
```

### 3. 例外的にUnicode文字が必要な場合
```python
# Windows環境でのエンコーディング対応
import sys
import io

# UTF-8出力を強制
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("✓ これで特殊文字も表示可能")
```

### 4. コードコメントでの注意
- コメント内でも特殊文字は避ける
- 絵文字やUnicode記号は使用しない
- ASCII文字で代替表現を使用

## 実装における原則
1. **本番コードの安全性**: 特殊文字は一切使用しない
2. **ログの可読性**: ASCII文字による明確な状態表示
3. **国際化対応**: 英語ベースの標準的な表現
4. **デバッグ効率**: 文字化けしない確実な出力

## チェックリスト
- [ ] logger出力にUnicode特殊文字なし
- [ ] print文にUnicode特殊文字なし  
- [ ] コメントにUnicode特殊文字なし
- [ ] 英語ベースの標準表現使用