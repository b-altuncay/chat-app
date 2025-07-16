// src/utils/password.js
const bcrypt = require('bcryptjs');

class PasswordUtils {
  constructor() {
    this.saltRounds = 12;
  }

  // Hash password
  async hashPassword(password) {
    try {
      console.log('🔐 Hashing password:', password);
      console.log('🧂 Salt rounds:', this.saltRounds);
      
      const salt = await bcrypt.genSalt(this.saltRounds);
      console.log('🧂 Generated salt:', salt);
      
      const hash = await bcrypt.hash(password, salt);
      console.log('✅ Generated hash:', hash);
      
      // Immediate test - hash edilen password'u hemen compare et
      const testCompare = await bcrypt.compare(password, hash);
      console.log('🧪 Immediate compare test:', testCompare);
      
      return hash;
    } catch (error) {
      console.error('❌ Hash error:', error);
      throw new Error('Password hashing failed');
    }
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
  try {
    console.log('🔍 Comparing:', { password, hashedPassword: hashedPassword.substring(0, 20) + '...' });
    const result = await bcrypt.compare(password, hashedPassword);
    console.log('✅ Compare result:', result);
    return result;
  } catch (error) {
    console.error('❌ Compare error:', error);
    throw new Error('Password comparison failed');
  }
}

  // Validate password strength
  validatePassword(password) {
    const errors = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (password.length > 128) {
      errors.push('Password cannot exceed 128 characters');
    }

    // Basit validation - production'da daha katı olabilir
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  // Calculate password strength score
  calculatePasswordStrength(password) {
    let score = 0;

    // Length bonus
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety bonus
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    // Unique character bonus
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 1;

    if (score <= 3) return 'weak';
    if (score <= 5) return 'medium';
    if (score <= 7) return 'strong';
    return 'very-strong';
  }

  // Generate random password
  generateRandomPassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

module.exports = new PasswordUtils();