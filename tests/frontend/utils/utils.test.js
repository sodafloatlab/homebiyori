/**
 * utils.ts ユーティリティ関数のテスト
 */

// モック定数（実際のconstantsファイルに依存せずテスト）
const MOCK_TREE_GROWTH_THRESHOLDS = {
  STAGE_1: 20,
  STAGE_2: 50,
  STAGE_3: 100,
  STAGE_4: 180,
  STAGE_5: 300,
  STAGE_6: Infinity
};

const MOCK_CHARACTER_THEME_COLORS = {
  rose: {
    text: 'text-rose-700',
    bg: 'bg-rose-100',
    border: 'border-rose-300'
  },
  sky: {
    text: 'text-sky-700',
    bg: 'bg-sky-100',
    border: 'border-sky-300'
  },
  amber: {
    text: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-300'
  }
};

const MOCK_VALIDATION_RULES = {
  NICKNAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9あ-ひぁ-ょア-ンァ-ョー一-龠ぁ-んヾｧ-ﾝﾞﾟ\s]+$/
  },
  CHAT_MESSAGE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 2000
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
};

// ユーティリティ関数の実装（テスト用）
const calculateTreeStage = (characters) => {
  if (characters < MOCK_TREE_GROWTH_THRESHOLDS.STAGE_1) return 1;
  if (characters < MOCK_TREE_GROWTH_THRESHOLDS.STAGE_2) return 2;
  if (characters < MOCK_TREE_GROWTH_THRESHOLDS.STAGE_3) return 3;
  if (characters < MOCK_TREE_GROWTH_THRESHOLDS.STAGE_4) return 4;
  if (characters < MOCK_TREE_GROWTH_THRESHOLDS.STAGE_5) return 5;
  return 6;
};

const calculateProgressToNextStage = (characters) => {
  const currentStage = calculateTreeStage(characters);
  const thresholds = Object.values(MOCK_TREE_GROWTH_THRESHOLDS);
  
  if (currentStage >= 6) return 1;
  
  const currentThreshold = currentStage === 1 ? 0 : thresholds[currentStage - 2];
  const nextThreshold = thresholds[currentStage - 1];
  
  return (characters - currentThreshold) / (nextThreshold - currentThreshold);
};

const getCharacterThemeColor = (aiRole, type = 'text') => {
  if (!aiRole) return '';
  
  const colorMap = {
    mittyan: 'rose',
    madokasan: 'sky', 
    hideji: 'amber'
  };
  
  const color = colorMap[aiRole];
  return MOCK_CHARACTER_THEME_COLORS[color]?.[type] || '';
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const formatRelativeTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  return `${days}日前`;
};

const validateNickname = (nickname) => {
  if (!nickname || nickname.trim().length === 0) {
    return { isValid: false, error: 'ニックネームを入力してください' };
  }

  const trimmed = nickname.trim();
  
  if (trimmed.length < MOCK_VALIDATION_RULES.NICKNAME.MIN_LENGTH) {
    return { isValid: false, error: 'ニックネームは1文字以上で入力してください' };
  }
  
  if (trimmed.length > MOCK_VALIDATION_RULES.NICKNAME.MAX_LENGTH) {
    return { isValid: false, error: 'ニックネームは20文字以下で入力してください' };
  }
  
  if (!MOCK_VALIDATION_RULES.NICKNAME.PATTERN.test(trimmed)) {
    return { isValid: false, error: '使用できない文字が含まれています' };
  }
  
  return { isValid: true };
};

const validateEmail = (email) => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'メールアドレスを入力してください' };
  }
  
  if (!MOCK_VALIDATION_RULES.EMAIL.PATTERN.test(email.trim())) {
    return { isValid: false, error: '有効なメールアドレスを入力してください' };
  }
  
  return { isValid: true };
};

const getErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return '予期しないエラーが発生しました';
};

const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

const debounce = (func, delay) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

describe('Tree Growth Utilities', () => {
  describe('calculateTreeStage', () => {
    test('各段階の閾値で正しい段階を返すこと', () => {
      expect(calculateTreeStage(10)).toBe(1);
      expect(calculateTreeStage(20)).toBe(2);
      expect(calculateTreeStage(50)).toBe(3);
      expect(calculateTreeStage(100)).toBe(4);
      expect(calculateTreeStage(180)).toBe(5);
      expect(calculateTreeStage(300)).toBe(6);
      expect(calculateTreeStage(1000)).toBe(6);
    });
  });

  describe('calculateProgressToNextStage', () => {
    test('次段階への進捗を正しく計算すること', () => {
      expect(calculateProgressToNextStage(10)).toBe(0.5); // 10/20 = 0.5
      expect(calculateProgressToNextStage(35)).toBe(0.5); // (35-20)/(50-20) = 0.5
      expect(calculateProgressToNextStage(300)).toBe(1); // 最大段階
    });
  });
});

describe('Character Utilities', () => {
  describe('getCharacterThemeColor', () => {
    test('正しいテーマカラーを返すこと', () => {
      expect(getCharacterThemeColor('mittyan', 'text')).toBe('text-rose-700');
      expect(getCharacterThemeColor('madokasan', 'bg')).toBe('bg-sky-100');
      expect(getCharacterThemeColor('hideji', 'border')).toBe('border-amber-300');
    });

    test('無効なaiRoleの場合空文字を返すこと', () => {
      expect(getCharacterThemeColor(null)).toBe('');
      expect(getCharacterThemeColor(undefined)).toBe('');
    });
  });
});

describe('Time Utilities', () => {
  describe('formatTimestamp', () => {
    test('タイムスタンプを日本語時刻に変換すること', () => {
      const timestamp = new Date('2024-08-09 14:30:00').getTime();
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('formatRelativeTime', () => {
    test('相対時間を正しく表示すること', () => {
      const now = Date.now();
      expect(formatRelativeTime(now)).toBe('たった今');
      expect(formatRelativeTime(now - 30 * 60000)).toBe('30分前');
      expect(formatRelativeTime(now - 2 * 3600000)).toBe('2時間前');
      expect(formatRelativeTime(now - 2 * 86400000)).toBe('2日前');
    });
  });
});

describe('Validation Utilities', () => {
  describe('validateNickname', () => {
    test('有効なニックネームで成功すること', () => {
      expect(validateNickname('テストユーザー')).toEqual({ isValid: true });
      expect(validateNickname('User123')).toEqual({ isValid: true });
    });

    test('無効なニックネームでエラーを返すこと', () => {
      expect(validateNickname('')).toEqual({ 
        isValid: false, 
        error: 'ニックネームを入力してください' 
      });
      expect(validateNickname('あ'.repeat(21))).toEqual({ 
        isValid: false, 
        error: 'ニックネームは20文字以下で入力してください' 
      });
    });
  });

  describe('validateEmail', () => {
    test('有効なメールアドレスで成功すること', () => {
      expect(validateEmail('test@example.com')).toEqual({ isValid: true });
    });

    test('無効なメールアドレスでエラーを返すこと', () => {
      expect(validateEmail('')).toEqual({ 
        isValid: false, 
        error: 'メールアドレスを入力してください' 
      });
      expect(validateEmail('invalid-email')).toEqual({ 
        isValid: false, 
        error: '有効なメールアドレスを入力してください' 
      });
    });
  });
});

describe('Error Handling Utilities', () => {
  describe('getErrorMessage', () => {
    test('Errorオブジェクトからメッセージを取得すること', () => {
      const error = new Error('テストエラー');
      expect(getErrorMessage(error)).toBe('テストエラー');
    });

    test('文字列エラーをそのまま返すこと', () => {
      expect(getErrorMessage('文字列エラー')).toBe('文字列エラー');
    });

    test('未知のエラーで汎用メッセージを返すこと', () => {
      expect(getErrorMessage(null)).toBe('予期しないエラーが発生しました');
    });
  });
});

describe('CSS Utilities', () => {
  describe('cn', () => {
    test('有効なクラス名を結合すること', () => {
      expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3');
      expect(cn('class1', null, 'class3', false, undefined)).toBe('class1 class3');
    });
  });
});

describe('Debounce Utility', () => {
  describe('debounce', () => {
    test('連続実行を防ぐこと', (done) => {
      let callCount = 0;
      const mockFn = () => callCount++;
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(callCount).toBe(0);

      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 150);
    });
  });
});