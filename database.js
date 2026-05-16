// database.js - CONFIGURAÇÃO DO SUPABASE
// COLOQUE SUAS CREDENCIAIS AQUI:

const SUPABASE_URL = 'https://tvbehwkuhfyrvnewbtwl.supabase.co';  // <--- COLOQUE SUA URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2YmVod2t1aGZ5cnZuZXdidHdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDYwNDEsImV4cCI6MjA5NDUyMjA0MX0.PpaRX3NuDNUfHQzKgC6SAh3scmpDqvk5-CcfnidpQYg';          // <--- COLOQUE SUA CHAVE

// =====================================================

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== USUÁRIOS ====================

async function findUserByUsername(username) {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .ilike('username', username)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error('Erro:', error);
        return null;
    }
    return data;
}

async function findUserByEmail(email) {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .ilike('email', email)
        .single();
    
    if (error && error.code !== 'PGRST116') return null;
    return data;
}

async function createUser(userData) {
    const { data, error } = await supabaseClient
        .from('users')
        .insert([userData])
        .select()
        .single();
    
    if (error) throw new Error(error.message);
    return data;
}

async function updateUser(username, updatedData) {
    const { data, error } = await supabaseClient
        .from('users')
        .update(updatedData)
        .ilike('username', username)
        .select()
        .single();
    
    if (error) throw new Error(error.message);
    return data;
}

async function getAllUsers() {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('id');
    
    if (error) return [];
    return data;
}

async function updateLastLogin(username) {
    return updateUser(username, { last_login: new Date().toISOString() });
}

// ==================== VIP KEYS ====================

async function generateMultipleVIPKeys(vipLevel, quantity, generatedBy) {
    const keys = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const levelMap = { 'BRONZE': 1, 'SILVER': 2, 'GOLD': 3, 'PLATINUM': 4, 'DIAMOND': 5 };
    const levelNumber = levelMap[vipLevel.toUpperCase()] || 5;
    
    for (let i = 0; i < quantity; i++) {
        let key = `VIP-${vipLevel.toUpperCase()}-`;
        for (let j = 0; j < 12; j++) {
            key += chars[Math.floor(Math.random() * chars.length)];
            if (j === 3 || j === 7) key += '-';
        }
        
        const { error } = await supabaseClient
            .from('vip_keys')
            .insert([{
                key_code: key,
                vip_level: levelNumber,
                generated_by: generatedBy
            }]);
        
        if (!error) keys.push(key);
    }
    return keys;
}

async function findVIPKey(key) {
    const { data, error } = await supabaseClient
        .from('vip_keys')
        .select('*')
        .eq('key_code', key)
        .single();
    
    if (error) return null;
    return data;
}

async function useVIPKey(key, username) {
    const { data, error } = await supabaseClient
        .from('vip_keys')
        .update({ used: true, used_by: username, used_at: new Date().toISOString() })
        .eq('key_code', key)
        .eq('used', false)
        .select()
        .single();
    
    if (error) return false;
    return data.vip_level;
}

async function getAllVIPKeys() {
    const { data, error } = await supabaseClient
        .from('vip_keys')
        .select('*')
        .order('id', { ascending: false });
    
    if (error) return [];
    return data;
}

async function getDatabaseStats() {
    const users = await getAllUsers();
    const vipKeys = await getAllVIPKeys();
    const totalCoins = users.reduce((sum, u) => sum + (u.game_data?.coins || 0), 0);
    
    return {
        totalUsers: users.length,
        totalVIPKeys: vipKeys.length,
        usedVIPKeys: vipKeys.filter(k => k.used).length,
        adminUsers: users.filter(u => u.is_admin).length,
        totalCoins: totalCoins
    };
}

// Exportar funções
window.AnimeDB = {
    findUserByUsername,
    findUserByEmail,
    createUser,
    updateUser,
    getAllUsers,
    updateLastLogin,
    getDatabaseStats,
    generateMultipleVIPKeys,
    findVIPKey,
    useVIPKey,
    getAllVIPKeys
};

console.log('✅ Database conectado ao Supabase!');
// ==================== USUÁRIOS ====================

// ADICIONE ESTA FUNÇÃO:
async function deleteUser(username) {
    const { data, error } = await supabaseClient
        .from('users')
        .delete()
        .ilike('username', username)
        .select()
        .single();
    
    if (error) throw new Error(error.message);
    return data;
}
