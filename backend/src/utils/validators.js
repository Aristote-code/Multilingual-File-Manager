const validateEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    if (!password) return false;
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return passwordRegex.test(password);
};

const validateUsername = (username) => {
    if (!username) return false;
    // 3-30 chars, letters, numbers, underscores
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
};

const validateLanguage = (lang) => {
    const supportedLanguages = ['en', 'fr', 'rw', 'sw'];
    return supportedLanguages.includes(lang);
};

const validateFileSize = (size, maxSize) => {
    return size > 0 && size <= maxSize;
};

const validateFileType = (mimeType) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'text/plain'
    ];
    return allowedTypes.includes(mimeType);
};

module.exports = {
    validateEmail,
    validatePassword,
    validateUsername,
    validateLanguage,
    validateFileSize,
    validateFileType
};
