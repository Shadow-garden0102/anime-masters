// ==================== BANCO DE DADOS ====================

function initDatabase() {
    if (!localStorage.getItem('animeMastersDB')) {
        const initialDB = {
            users: [],
            vipKeys: [],
            nextId: 1,
            version: '1.0',
            lastBackup: new Date().toISOString()
        };
        localStorage.setItem('animeMastersDB', JSON.stringify(initialDB));
    }
    return JSON.parse(localStorage.getItem('animeMastersDB'));
}

function saveDatabase(db) {
    localStorage.setItem('animeMastersDB', JSON.stringify(db));
}

function findUserByUsername(username) {
    const db = initDatabase();
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

function findUserByEmail(email) {
    const db = initDatabase();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function createUser(userData) {
    const db = initDatabase();
    
    if (findUserByUsername(userData.username)) {
        throw new Error('Usuário já existe!');
    }
    if (findUserByEmail(userData.email)) {
        throw new Error('Email já cadastrado!');
    }
    
    const newUser = {
        id: db.nextId++,
        username: userData.username,
        email: userData.email,
        password: userData.password,
        isAdmin: userData.isAdmin || false,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        gameData: userData.gameData || null
    };
    
    db.users.push(newUser);
    saveDatabase(db);
    return newUser;
}

function updateUser(username, updatedData) {
    const db = initDatabase();
    const index = db.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (index === -1) {
        throw new Error('Usuário não encontrado!');
    }
    
    db.users[index] = { ...db.users[index], ...updatedData };
    saveDatabase(db);
    return db.users[index];
}

function deleteUser(username) {
    const db = initDatabase();
    const index = db.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (index === -1) {
        throw new Error('Usuário não encontrado!');
    }
    
    const deleted = db.users.splice(index, 1)[0];
    saveDatabase(db);
    return deleted;
}

function getAllUsers() {
    const db = initDatabase();
    return db.users;
}

function updateLastLogin(username) {
    return updateUser(username, { lastLogin: new Date().toISOString() });
}

function getDatabaseStats() {
    const db = initDatabase();
    const totalCoins = db.users.reduce((sum, u) => sum + (u.gameData?.coins || 0), 0);
    return {
        totalUsers: db.users.length,
        totalVIPKeys: db.vipKeys?.length || 0,
        usedVIPKeys: db.vipKeys?.filter(k => k.used).length || 0,
        adminUsers: db.users.filter(u => u.isAdmin).length,
        totalCoins: totalCoins
    };
}

function exportUsersToCSV() {
    const users = getAllUsers();
    const headers = ['ID', 'Username', 'Email', 'Admin', 'Coins', 'Gems', 'Level', 'VIP Level', 'Created At', 'Last Login'];
    
    const rows = users.map(u => [
        u.id,
        u.username,
        u.email,
        u.isAdmin ? 'Sim' : 'Não',
        u.gameData?.coins || 0,
        u.gameData?.gems || 0,
        u.gameData?.pickaxeLevel || 0,
        u.gameData?.vipLevel || 0,
        u.createdAt,
        u.lastLogin || 'Nunca'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${new Date().toISOString().slice(0,19)}.csv`);
    link.click();
    URL.revokeObjectURL(url);
}

function backupDatabase() {
    const db = initDatabase();
    db.lastBackup = new Date().toISOString();
    saveDatabase(db);
    
    const dataStr = JSON.stringify(db, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `animeMasters_backup_${new Date().toISOString().slice(0,19)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    return db;
}

function restoreDatabase(backupData) {
    try {
        const db = JSON.parse(backupData);
        if (db.version && db.users) {
            localStorage.setItem('animeMastersDB', JSON.stringify(db));
            return true;
        }
        return false;
    } catch (e) {
        console.error('Erro ao restaurar backup:', e);
        return false;
    }
}

function cleanOldUsers(daysInactive = 30) {
    const db = initDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    
    const activeUsers = db.users.filter(u => {
        if (!u.lastLogin) return true;
        return new Date(u.lastLogin) > cutoffDate;
    });
    
    db.users = activeUsers;
    saveDatabase(db);
    return db.users.length;
}

// ==================== FUNÇÕES VIP ====================

const VIP_LEVEL_MAP = {
    'BRONZE': 1,
    'SILVER': 2,
    'GOLD': 3,
    'PLATINUM': 4,
    'DIAMOND': 5
};

function generateVIPKey(vipLevel, generatedBy) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = `VIP-${vipLevel.toUpperCase()}-`;
    for (let i = 0; i < 12; i++) {
        key += chars[Math.floor(Math.random() * chars.length)];
        if (i === 3 || i === 7) key += '-';
    }
    return key;
}

function saveVIPKey(key, vipLevel, generatedBy) {
    const db = initDatabase();
    if (!db.vipKeys) db.vipKeys = [];
    
    let levelNumber = VIP_LEVEL_MAP[vipLevel.toUpperCase()] || 5;
    
    db.vipKeys.push({
        key: key,
        vipLevel: levelNumber,
        generatedBy: generatedBy,
        generatedAt: new Date().toISOString(),
        used: false,
        usedBy: null,
        usedAt: null
    });
    
    saveDatabase(db);
    return key;
}

function generateMultipleVIPKeys(vipLevel, quantity, generatedBy) {
    const keys = [];
    for (let i = 0; i < quantity; i++) {
        const key = generateVIPKey(vipLevel, generatedBy);
        saveVIPKey(key, vipLevel, generatedBy);
        keys.push(key);
    }
    return keys;
}

function findVIPKey(key) {
    const db = initDatabase();
    if (!db.vipKeys) return null;
    return db.vipKeys.find(k => k.key === key);
}

function useVIPKey(key, username) {
    const db = initDatabase();
    const keyData = db.vipKeys.find(k => k.key === key);
    
    if (!keyData) return false;
    if (keyData.used) return false;
    
    keyData.used = true;
    keyData.usedBy = username;
    keyData.usedAt = new Date().toISOString();
    
    saveDatabase(db);
    return keyData.vipLevel;
}

function getAllVIPKeys() {
    const db = initDatabase();
    return db.vipKeys || [];
}

// ==================== EXPORTAR FUNÇÕES ====================

window.AnimeDB = {
    initDatabase,
    saveDatabase,
    findUserByUsername,
    findUserByEmail,
    createUser,
    updateUser,
    deleteUser,
    getAllUsers,
    updateLastLogin,
    getDatabaseStats,
    exportUsersToCSV,
    backupDatabase,
    restoreDatabase,
    cleanOldUsers,
    generateVIPKey,
    saveVIPKey,
    generateMultipleVIPKeys,
    findVIPKey,
    useVIPKey,
    getAllVIPKeys
};

console.log('✅ Database loaded! Users:', getAllUsers().length);