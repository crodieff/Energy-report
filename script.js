// 能量分数配置
const ENERGY_CONFIG = {
    meal: {
        1: 5,    // 5分饱
        2: 8,    // 6分饱
        3: 12,   // 7分饱
        4: 15,   // 8分饱（最高分）
        5: 8,    // 9分饱
        6: -5,   // 10分饱（扣分）
        '-1': -10, // 未吃
        '-2': -8   // 不健康
    },
    snack: {
        0: 0,    // 未记录
        5: 5,    // 最健康：水果、酸奶、坚果
        3: 3,    // 中等健康：肉脯
        '-3': -3, // 不太健康：面包、饼干、果汁
        '-5': -5  // 高热量避雷：蛋糕、奶茶、巧克力
    },
    exercise: {
        '-5': -5,  // 未运动
        10: 10,   // 轻度
        20: 20,   // 中度
        30: 30,   // 重度
        45: 45    // 高强度
    },
    mood: {
        '-20': -20, // 低落
        '-10': -10, // 一般
        0: 0,      // 平静
        10: 10,    // 愉快
        20: 20     // 开心
    },
    sleepQuality: {
        '-20': -20, // 非常差
        '-10': -10, // 较差
        0: 0,      // 一般
        15: 15,    // 良好
        30: 30     // 非常好
    },
    chore: {
        10: 10,   // 轻度
        20: 20,   // 中度
        30: 30    // 重度
    },
    health: {
        20: 20,   // 精力充沛
        10: 10,   // 状态良好
        5: 5,     // 一般
        '-10': -10, // 疲劳
        '-15': -15, // 不舒服
        '-20': -20  // 生病
    }
};

// 获取今日日期
function getToday() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// 全局变量
let editingRecordId = null;

// 删除确认（提前定义确保 onclick 能调用）
window.confirmDeleteRecord = function(recordId) {
    console.log('confirmDeleteRecord called with recordId:', recordId);
    
    if (!confirm('确定要删除这条记录吗？')) {
        console.log('User cancelled deletion');
        return;
    }
    
    window.deleteRecord(recordId);
};

// 删除记录（提前定义确保 onclick 能调用）
window.deleteRecord = function(recordId) {
    console.log('deleteRecord called with recordId:', recordId);
    
    let records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    console.log('Current records count:', records.length);
    
    const deletedRecord = records.find(r => String(r.id) === String(recordId));
    console.log('Deleted record found:', deletedRecord);
    
    if (!deletedRecord) {
        alert('未找到要删除的记录');
        return;
    }
    
    records = records.filter(r => String(r.id) !== String(recordId));
    localStorage.setItem('energyRecords', JSON.stringify(records));
    console.log('Records after deletion:', records.length);
    
    const deletedEnergy = parseInt(deletedRecord.energy) || 0;
    const currentVitality = parseInt(localStorage.getItem('vitality')) || 0;
    const newVitality = Math.max(0, currentVitality - deletedEnergy);
    
    console.log('Vitality change:', currentVitality, '→', newVitality);
    
    addLog(deletedRecord.date, 'delete', `删除记录（${deletedEnergy}分）`);
    localStorage.setItem('vitality', newVitality.toString());
    
    // 记录元气值消耗（删除记录）
    if (deletedEnergy > 0) {
        addVitalityRecord('spend', deletedEnergy, '删除记录扣减');
    }
    
    const accumulatedDates = JSON.parse(localStorage.getItem('accumulatedDates') || '[]');
    const updatedDates = accumulatedDates.filter(d => d !== deletedRecord.date);
    localStorage.setItem('accumulatedDates', JSON.stringify(updatedDates));
    
    if (editingRecordId === recordId) {
        editingRecordId = null;
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.textContent = '💾 保存记录';
        }
    }
    
    // 刷新元气值页面
    if (document.getElementById('vitality') && document.getElementById('vitality').classList.contains('active')) {
        loadVitality();
    }
    
    // 刷新历史记录页面
    if (document.getElementById('history') && document.getElementById('history').classList.contains('active')) {
        loadHistory();
    }
    
    if (document.getElementById('report').classList.contains('active')) {
        generateReport();
    }
    
    alert(`删除成功！\n日期: ${deletedRecord.date}\n能量值: ${deletedRecord.energy}\n\n元气值: ${currentVitality} → ${newVitality} (-${deletedEnergy})`);
};

// 编辑记录（提前定义确保 onclick 能调用）
window.editRecord = function(id) {
    console.log('=== editRecord 被调用 ===');
    console.log('传入的id:', id);
    
    const records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    const record = records.find(r => String(r.id) === String(id));
    
    if (!record) {
        console.log('找不到记录');
        return;
    }
    
    editingRecordId = id;
    console.log('editingRecordId 已设置为:', editingRecordId);
    
    // 切换到数据录入页面（使用自定义方式，避免触发resetInputForm）
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    const dataTab = document.querySelector('[data-tab="input"]');
    const inputContent = document.getElementById('input');
    if (dataTab) dataTab.classList.add('active');
    if (inputContent) inputContent.classList.add('active');
    
    console.log('页面切换完成，editingRecordId:', editingRecordId);
    
    document.getElementById('recordDate').value = record.date;
    document.getElementById('breakfast').value = record.breakfast || '0';
    document.getElementById('lunch').value = record.lunch || '0';
    document.getElementById('dinner').value = record.dinner || '0';
    document.getElementById('snack').value = record.snack || '0';
    // 设置运动分数
    document.getElementById('exercise').value = record.exercise || '0';
    
    // 设置运动项目和时长
    if (record.exerciseItems) {
        try {
            const exerciseData = JSON.parse(record.exerciseItems);
            document.getElementById('exerciseItems').value = record.exerciseItems;
            
            // 设置运动项目复选框和时长
            document.querySelectorAll('.exercise-checkbox').forEach(checkbox => {
                const item = exerciseData.find(exItem => exItem.name === checkbox.dataset.name);
                if (item) {
                    checkbox.checked = true;
                    const parentLabel = checkbox.closest('.dropdown-option');
                    const durationSelect = parentLabel.querySelector('.exercise-duration-select');
                    if (durationSelect) {
                        durationSelect.style.display = 'inline-block';
                        durationSelect.value = item.duration || '';
                    }
                } else {
                    checkbox.checked = false;
                    const parentLabel = checkbox.closest('.dropdown-option');
                    const durationSelect = parentLabel.querySelector('.exercise-duration-select');
                    if (durationSelect) {
                        durationSelect.style.display = 'none';
                        durationSelect.value = '';
                    }
                }
            });
        } catch (e) {
            console.error('解析运动数据失败:', e);
        }
    }
    
    // 重新计算运动分数
    calculateExerciseScore();
    document.getElementById('mood').value = record.mood || '0';
    document.getElementById('sleepHours').value = record.sleepHours || '';
    document.getElementById('sleepQuality').value = record.sleepQuality || '0';
    document.getElementById('sleepTime').value = record.sleepTime || '';
    document.getElementById('wakeTime').value = record.wakeTime || '';
    document.getElementById('chore').value = record.chore || '0';
    document.getElementById('choreItems').value = record.choreItems || '[]';
    
    // 设置家务项目和时长
    if (record.choreItems) {
        try {
            const choreData = JSON.parse(record.choreItems);
            
            // 设置家务项目复选框和时长
            document.querySelectorAll('.chore-checkbox').forEach(checkbox => {
                const item = choreData.find(chItem => chItem.name === checkbox.dataset.name || (typeof chItem === 'string' && chItem === checkbox.dataset.name));
                if (item) {
                    checkbox.checked = true;
                    const parentLabel = checkbox.closest('.dropdown-option');
                    const durationSelect = parentLabel.querySelector('.chore-duration-select');
                    if (durationSelect) {
                        durationSelect.style.display = 'inline-block';
                        durationSelect.value = typeof item === 'object' ? item.duration || '' : '';
                    }
                } else {
                    checkbox.checked = false;
                    const parentLabel = checkbox.closest('.dropdown-option');
                    const durationSelect = parentLabel.querySelector('.chore-duration-select');
                    if (durationSelect) {
                        durationSelect.style.display = 'none';
                        durationSelect.value = '';
                    }
                }
            });
        } catch (e) {
            console.error('解析家务数据失败:', e);
        }
    }
    
    document.getElementById('health').value = record.health || '0';
    document.getElementById('healthDetail').value = record.healthDetail || '';
    document.getElementById('notes').value = record.notes || '';
    
    // 设置零食分数显示
    document.getElementById('snack').value = record.snack || '0';
    calculateSnackScore();
    
    // 设置家务分数显示
    calculateChoreScore();
    
    document.getElementById('saveBtn').textContent = '✏️ 更新记录';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 显示项目详情弹窗
function showWishDetail(wishId) {
    const savedWishes = JSON.parse(localStorage.getItem('wishes') || JSON.stringify(wishes));
    const wish = savedWishes.find(w => w.id === wishId);
    
    if (!wish) return;
    
    const vitality = getVitality();
    const claimCount = wish.claimCount || 0;
    const canClaim = vitality >= wish.cost;
    
    const modalHtml = `
        <div class="wish-detail-overlay" onclick="closeWishDetail()">
            <div class="wish-detail-modal flip-card" onclick="event.stopPropagation()" id="wishModal${wishId}">
                <div class="flip-card-inner">
                    <!-- 正面 - 项目信息 -->
                    <div class="flip-card-front">
                        <div class="detail-header">
                            <div class="detail-icon">${wish.icon}</div>
                            <div class="detail-title">${wish.title}</div>
                            <button class="detail-close" onclick="closeWishDetail()">✕</button>
                        </div>
                        <div class="detail-content">
                            <div class="detail-tier">
                                ${getTierName(wish.tier)}
                            </div>
                            <div class="detail-description">${wish.description}</div>
                            <div class="detail-cost">
                                <span class="cost-label">所需元气值</span>
                                <span class="cost-value">${wish.cost}</span>
                            </div>
                            ${claimCount > 0 ? `<div class="detail-count">已领取 ${claimCount} 次</div>` : ''}
                        </div>
                        <div class="detail-footer">
                            ${canClaim ? `
                                <button class="detail-claim-btn" onclick="claimWishWithGuide(${wishId})">
                                    ${claimCount > 0 ? '🔄 再次兑换' : '✨ 立即兑换'}
                                </button>
                            ` : `
                                <div class="detail-locked">还需 ${wish.cost - vitality} 元气值解锁</div>
                            `}
                        </div>
                    </div>
                    
                    <!-- 背面 - 治愈引导语 -->
                    <div class="flip-card-back">
                        <div class="detail-header back-header">
                            <div class="detail-icon">💖</div>
                            <button class="detail-close" onclick="closeWishDetail()">✕</button>
                        </div>
                        <div class="detail-content guide-content-full">
                            <div class="guide-icon">${wish.icon}</div>
                            <div class="guide-title">${wish.title}</div>
                            <div class="guide-text">${wish.guide || '享受这个治愈的时刻吧~'}</div>
                            <div class="guide-enhance">
                                <p>🌿 深呼吸，让自己完全沉浸在当下</p>
                                <p>✨ 放下所有的期待，只需感受</p>
                                <p>💫 这是专属于你的治愈时光</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 兑换并显示引导语
function claimWishWithGuide(wishId) {
    claimWish(wishId);
    
    // 添加翻转动画
    setTimeout(() => {
        const modal = document.getElementById(`wishModal${wishId}`);
        if (modal) {
            modal.classList.add('flip');
        }
    }, 300);
}

function closeWishDetail() {
    const overlay = document.querySelector('.wish-detail-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function getTierName(tier) {
    const tiers = {
        1: '🌸 微风轻语',
        2: '🌺 暖阳浸润',
        3: '🌻 心光绽放',
        4: '✨ 灵魂共振',
        5: '💎 生命璀璨'
    };
    return tiers[tier] || '未知层级';
}

// 折叠/展开层级
function toggleTier(header) {
    const tierWishes = header.nextElementSibling;
    const toggleIcon = header.querySelector('.tier-toggle');
    
    if (tierWishes.style.display === 'none') {
        tierWishes.style.display = 'grid';
        toggleIcon.textContent = '▼';
    } else {
        tierWishes.style.display = 'none';
        toggleIcon.textContent = '▶';
    }
}

// 确保wishes数据已初始化并更新为新格式
function ensureWishesInitialized() {
    const storedWishes = localStorage.getItem('wishes');
    
    if (!storedWishes) {
        localStorage.setItem('wishes', JSON.stringify(wishes));
        console.log('Wishes initialized');
        return;
    }
    
    // 检查是否是新格式（包含tier字段）
    try {
        const parsed = JSON.parse(storedWishes);
        if (parsed.length > 0 && !parsed[0].tier) {
            // 旧格式，更新为新格式并保留已领取状态
            const newWishes = [...wishes];
            parsed.forEach(oldWish => {
                const newWish = newWishes.find(w => w.title === oldWish.title);
                if (newWish && oldWish.claimed) {
                    newWish.claimed = true;
                }
            });
            localStorage.setItem('wishes', JSON.stringify(newWishes));
            console.log('Wishes updated to new format');
        }
    } catch (e) {
        localStorage.setItem('wishes', JSON.stringify(wishes));
        console.log('Wishes fixed due to parse error');
    }
}

// 元气值相关函数（提前定义以确保提升）
function getVitality() {
    const stored = localStorage.getItem('vitality');
    if (stored === null) {
        localStorage.setItem('vitality', '0');
        return 0;
    }
    return parseInt(stored);
}

function addVitality(points) {
    let current = getVitality();
    console.log('addVitality - 当前元气值:', current, '新增点数:', points);
    current += points;
    localStorage.setItem('vitality', current.toString());
    console.log('addVitality - 更新后元气值:', current);
    
    const accumulatedDates = JSON.parse(localStorage.getItem('accumulatedDates') || '[]');
    const today = getToday();
    if (!accumulatedDates.includes(today)) {
        accumulatedDates.push(today);
        localStorage.setItem('accumulatedDates', JSON.stringify(accumulatedDates));
    }
    
    // 记录元气值获得
    addVitalityRecord('earn', points, '记录能量获得');
    
    checkWishUnlocks();
    
    if (document.getElementById('vitality') && document.getElementById('vitality').classList.contains('active')) {
        loadVitality();
    }
}

// 添加元气值变化记录
function addVitalityRecord(type, amount, description) {
    const records = JSON.parse(localStorage.getItem('vitalityRecords') || '[]');
    const record = {
        id: Date.now().toString(),
        type: type, // 'earn' 或 'spend'
        amount: amount,
        description: description,
        date: getToday(),
        timestamp: Date.now()
    };
    records.push(record);
    localStorage.setItem('vitalityRecords', JSON.stringify(records));
    
    // 如果当前在历史记录页面，刷新显示
    if (document.getElementById('history')?.classList.contains('active')) {
        loadVitalityHistory();
    }
}

// 从能量记录初始化元气值变化记录（首次使用时）
function initVitalityRecordsFromEnergy() {
    const energyRecords = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    const vitalityRecords = [];
    
    energyRecords.forEach(record => {
        const energy = parseInt(record.energy) || 0;
        if (energy > 0) {
            vitalityRecords.push({
                id: `init-${record.id}`,
                type: 'earn',
                amount: energy,
                description: '历史数据导入',
                date: record.date,
                timestamp: record.timestamp || Date.now()
            });
        }
    });
    
    console.log('Initialized vitality records from energy records:', vitalityRecords.length);
    return vitalityRecords;
}

// 加载元气值历史记录和统计
function loadVitalityHistory() {
    console.log('=== loadVitalityHistory 被调用 ===');
    let records = JSON.parse(localStorage.getItem('vitalityRecords') || '[]');
    console.log('vitalityRecords 数量:', records.length);
    console.log('vitalityRecords 数据:', records);
    
    // 如果没有元气值变化记录，尝试从能量记录初始化
    if (records.length === 0) {
        console.log('vitalityRecords为空，尝试从能量记录初始化');
        records = initVitalityRecordsFromEnergy();
        localStorage.setItem('vitalityRecords', JSON.stringify(records));
        console.log('初始化后vitalityRecords数量:', records.length);
    }
    
    const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);
    console.log('排序后记录数量:', sortedRecords.length);
    
    // 计算统计数据
    const totalEarned = records
        .filter(r => r.type === 'earn')
        .reduce((sum, r) => sum + r.amount, 0);
    
    const totalSpent = records
        .filter(r => r.type === 'spend')
        .reduce((sum, r) => sum + r.amount, 0);
    
    const currentVitality = getVitality();
    
    // 更新统计显示
    if (document.getElementById('totalEarned')) {
        document.getElementById('totalEarned').textContent = totalEarned;
    }
    if (document.getElementById('totalSpent')) {
        document.getElementById('totalSpent').textContent = totalSpent;
    }
    if (document.getElementById('currentVitality')) {
        document.getElementById('currentVitality').textContent = currentVitality;
    }
    
    // 更新变化记录列表
    const vitalityHistoryList = document.getElementById('vitalityHistoryList');
    if (!vitalityHistoryList) return;
    
    if (sortedRecords.length === 0) {
        vitalityHistoryList.innerHTML = '<p class="empty-message">暂无元气值变化记录</p>';
        return;
    }
    
    vitalityHistoryList.innerHTML = sortedRecords.map(record => {
        const typeText = record.type === 'earn' ? '📈' : '💸';
        const changeClass = record.type === 'earn' ? 'positive' : 'negative';
        const changeText = record.type === 'earn' ? `+${record.amount}` : `-${record.amount}`;
        const description = record.description || (record.type === 'earn' ? '获得元气' : '消耗元气');
        
        return `
            <div class="vitality-item">
                <div class="vitality-info">
                    <span class="vitality-icon">${typeText}</span>
                    <div class="vitality-details">
                        <span class="vitality-desc">${description}</span>
                        <span class="vitality-date">${record.date}</span>
                    </div>
                </div>
                <span class="vitality-change ${changeClass}">${changeText}</span>
            </div>
        `;
    }).join('');
}

function checkWishUnlocks() {
    const vitality = getVitality();
    console.log('Current vitality:', vitality);
    const savedWishes = JSON.parse(localStorage.getItem('wishes') || JSON.stringify(wishes));
    console.log('Loaded wishes count:', savedWishes.length);
    
    savedWishes.forEach(wish => {
        if (!wish.claimed && vitality >= wish.cost) {
            wish.unlocked = true;
        }
    });
    
    localStorage.setItem('wishes', JSON.stringify(savedWishes));
}

function claimWish(wishId) {
    const vitality = getVitality();
    const savedWishes = JSON.parse(localStorage.getItem('wishes') || JSON.stringify(wishes));
    const wish = savedWishes.find(w => w.id === wishId);
    
    if (!wish) return;
    if (vitality < wish.cost) {
        alert('元气值不足，继续努力积累吧！');
        return;
    }
    
    localStorage.setItem('vitality', (vitality - wish.cost).toString());
    
    // 记录元气值消耗
    addVitalityRecord('spend', wish.cost, `兑换「${wish.title}」`);
    
    wish.claimCount = (wish.claimCount || 0) + 1;
    localStorage.setItem('wishes', JSON.stringify(savedWishes));
    loadVitality();
    alert(`🎉 恭喜！您已成功兑换「${wish.title}」！`);
}

function loadVitality() {
    const vitality = getVitality();
    console.log('Current vitality:', vitality);
    
    // 确保wishes数据已初始化
    ensureWishesInitialized();
    
    // 先检查并更新解锁状态
    checkWishUnlocks();
    
    const savedWishes = JSON.parse(localStorage.getItem('wishes') || JSON.stringify(wishes));
    console.log('Total wishes loaded:', savedWishes.length);
    
    document.getElementById('vitalityValue').textContent = vitality;
    document.getElementById('vitalityProgress').style.width = `${Math.min((vitality / 5000) * 100, 100)}%`;
    
    // 按层级分组 - 温暖治愈配色
    const tiers = [
        { tier: 1, name: '🌿 微风轻语', color: '#A8C5A0', description: '小而轻的治愈时光，随时能开启' },
        { tier: 2, name: '🍂 暖阳浸润', color: '#C4A77D', description: '带着仪式感的温柔滋养' },
        { tier: 3, name: '🌾 心光绽放', color: '#B8A9C9', description: '需要用心积累的生活仪式' },
        { tier: 4, name: '🌌 灵魂共振', color: '#9CAFAA', description: '深入内心的深度体验' },
        { tier: 5, name: '✨ 生命璀璨', color: '#D4C4A8', description: '值得用时光珍藏的稀缺体验' }
    ];
    
    let wishHtml = '';
    
    tiers.forEach((tierInfo, tierIndex) => {
        const tierWishes = savedWishes.filter(w => w.tier === tierInfo.tier);
        console.log('Tier:', tierInfo.tier, 'wishes:', tierWishes.length);
        const unlockedCount = tierWishes.filter(w => w.claimed || vitality >= w.cost).length;
        const totalCount = tierWishes.length;
        const hasUnlocked = unlockedCount > 0;
        const isFirstTier = tierIndex === 0;
        const isCollapsed = !isFirstTier && !hasUnlocked;
        
        wishHtml += `
            <div class="tier-section" style="border-top: 3px solid ${tierInfo.color};">
                <div class="tier-header" onclick="toggleTier(this)">
                    <div class="tier-name" style="color: ${tierInfo.color};">${tierInfo.name}</div>
                    <div class="tier-description">${tierInfo.description}</div>
                    <div class="tier-progress">已解锁 ${unlockedCount}/${totalCount}</div>
                    <span class="tier-toggle">${isCollapsed ? '▶' : '▼'}</span>
                </div>
                <div class="tier-wishes" ${isCollapsed ? 'style="display: none;"' : ''}>
        `;
        
        // 排序：未领取的按元气值从小到大，已领取的排到后面
        const sortedWishes = [...tierWishes].sort((a, b) => {
            // 已领取的排到后面
            if (a.claimed !== b.claimed) {
                return a.claimed ? 1 : -1;
            }
            // 未领取的按元气值从小到大
            return a.cost - b.cost;
        });
        
        sortedWishes.forEach(wish => {
            let status = 'locked';
            let statusText = '';
            let claimBtn = '';
            let claimCount = wish.claimCount || 0;
            
            if (claimCount > 0 && vitality >= wish.cost) {
                // 已领取过但可以再次领取
                status = 'claimed';
                statusText = `已领取 ${claimCount} 次`;
                claimBtn = `<button class="wish-claim-btn" onclick="claimWish(${wish.id})">🔄 再次兑换</button>`;
            } else if (claimCount > 0) {
                // 已领取过但元气值不足
                status = 'claimed';
                statusText = `已领取 ${claimCount} 次`;
            } else if (vitality >= wish.cost) {
                status = 'unlocked';
                claimBtn = `<button class="wish-claim-btn" onclick="claimWish(${wish.id})">✨ 兑换</button>`;
            } else {
                statusText = '未解锁';
            }
            
            wishHtml += `
                <div class="wish-card ${status}" style="border-color: ${tierInfo.color}30;">
                    <div class="wish-icon">${wish.icon}</div>
                    <div class="wish-title">${wish.title}</div>
                    <div class="wish-cost">${wish.cost} 元气</div>
                    <div class="wish-tooltip">
                        <div class="tooltip-icon">💡</div>
                        <div class="tooltip-content">
                            <div class="tooltip-title">${wish.icon} ${wish.title}</div>
                            <div class="tooltip-desc">${wish.description}</div>
                            <div class="tooltip-cost">需要 ${wish.cost} 元气值</div>
                        </div>
                    </div>
                    ${statusText ? `<div class="wish-status ${status}">${statusText}</div>` : ''}
                    ${claimBtn}
                </div>
            `;
        });
        
        wishHtml += `
                </div>
            </div>
        `;
    });
    
    // 找出当前可兑换的项目（元气值足够但未领取或可再次领取）
    const availableWishes = savedWishes.filter(w => {
        const claimCount = w.claimCount || 0;
        return vitality >= w.cost;
    });
    
    // 找出即将解锁的项目（元气值不足但最接近的）
    const lockedWishes = savedWishes.filter(w => vitality < w.cost);
    lockedWishes.sort((a, b) => a.cost - b.cost);
    const upcomingWish = lockedWishes[0];
    
    // 生成顶部快速预览区域
    let quickPreviewHtml = '';
    if (availableWishes.length > 0) {
        quickPreviewHtml = `
            <div class="quick-preview">
                <div class="preview-header">
                    <h3>✨ 当前可兑换</h3>
                    <span class="preview-count">${availableWishes.length}个项目</span>
                </div>
                <div class="preview-wishes">
        `;
        availableWishes.slice(0, 6).forEach(wish => {
            const claimCount = wish.claimCount || 0;
            quickPreviewHtml += `
                <div class="preview-card" onclick="showWishDetail(${wish.id})">
                    <div class="preview-icon">${wish.icon}</div>
                    <div class="preview-title">${wish.title}</div>
                    <div class="preview-cost">${wish.cost}元气</div>
                    ${claimCount > 0 ? `<div class="preview-count-badge">${claimCount}次</div>` : ''}
                </div>
            `;
        });
        if (availableWishes.length > 6) {
            quickPreviewHtml += `<div class="preview-more">+${availableWishes.length - 6}个</div>`;
        }
        quickPreviewHtml += `
                </div>
            </div>
        `;
    }
    
    // 生成即将解锁提示
    let upcomingHtml = '';
    if (upcomingWish) {
        const remaining = upcomingWish.cost - vitality;
        upcomingHtml = `
            <div class="upcoming-section">
                <div class="upcoming-icon">🎯</div>
                <div class="upcoming-content">
                    <div class="upcoming-title">即将解锁：${upcomingWish.icon} ${upcomingWish.title}</div>
                    <div class="upcoming-progress">
                        <div class="upcoming-bar">
                            <div class="upcoming-fill" style="width: ${Math.min((vitality / upcomingWish.cost) * 100, 100)}%;"></div>
                        </div>
                        <span class="upcoming-text">还差 <strong>${remaining}</strong> 元气值</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 计算解锁进度
    const totalWishes = savedWishes.length;
    const unlockedWishes = savedWishes.filter(w => vitality >= w.cost).length;
    const claimedWishes = savedWishes.filter(w => (w.claimCount || 0) > 0).length;
    
    // 更新顶部统计
    document.getElementById('unlockedCount').textContent = `${unlockedWishes}/${totalWishes}`;
    document.getElementById('claimedCount').textContent = claimedWishes;
    
    // 生成治愈风格的装备解锁界面
    let gameStyleHtml = `
        <div class="equipment-grid">
    `;
    
    // 按层级分组展示
    tiers.forEach(tierInfo => {
        const tierWishes = savedWishes.filter(w => w.tier === tierInfo.tier);
        tierWishes.sort((a, b) => a.cost - b.cost);
        
        const tierUnlocked = tierWishes.filter(w => vitality >= w.cost).length;
        const tierClaimed = tierWishes.filter(w => (w.claimCount || 0) > 0).length;
        
        gameStyleHtml += `
            <div class="equipment-tier" style="border-top: 3px solid ${tierInfo.color};">
                <div class="tier-header-row" style="border-bottom-color: ${tierInfo.color}50;">
                    <div class="tier-title" style="color: ${tierInfo.color};">${tierInfo.name}</div>
                    <div class="tier-stats">
                        <span class="tier-stat unlocked">可兑换 ${tierUnlocked}/${tierWishes.length}</span>
                        <span class="tier-stat claimed">已兑换 ${tierClaimed}</span>
                    </div>
                </div>
                <div class="tier-cards">
        `;
        
        tierWishes.forEach(wish => {
            const isUnlocked = vitality >= wish.cost;
            const isClaimed = (wish.claimCount || 0) > 0;
            const claimCount = wish.claimCount || 0;
            const remaining = wish.cost - vitality;
            
            gameStyleHtml += `
                <div class="equipment-card ${isUnlocked ? 'unlocked' : 'locked'}" onclick="${isUnlocked ? `showWishDetail(${wish.id})` : ''}">
                    <div class="card-glow ${isUnlocked ? '' : 'hidden'}"></div>
                    <div class="card-icon">${wish.icon}</div>
                    <div class="card-title">${wish.title}</div>
                    <div class="card-cost">${wish.cost} 💎</div>
                    ${isClaimed ? `<div class="card-claimed">已兑换 ${claimCount}次</div>` : ''}
                    ${!isUnlocked ? `<div class="card-locked-hint">还差 ${remaining} 元气</div>` : ''}
                </div>
            `;
        });
        
        gameStyleHtml += `
                </div>
            </div>
        `;
    });
    
    gameStyleHtml += `</div>`;
    
    document.getElementById('wishGrid').innerHTML = gameStyleHtml;
}

// 初始化日期选择器
document.getElementById('recordDate').value = getToday();

// 设置默认日期范围（最近7天）
function setDefaultDateRange() {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    document.getElementById('startDate').value = sevenDaysAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = getToday();
}

setDefaultDateRange();

// 时间范围选择事件
document.getElementById('timeRange').addEventListener('change', function() {
    const range = this.value;
    const today = new Date();
    let startDate;
    
    switch (range) {
        case 'week':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 6);
            break;
        case 'month':
            startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case 'halfyear':
            startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 6);
            break;
        case 'year':
            startDate = new Date(today);
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        default:
            return;
    }
    
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    
    // 如果当前在报表页面，自动生成报表
    if (document.getElementById('report').classList.contains('active')) {
        generateReport();
    }
});

// 心情按钮点击事件
document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('mood').value = this.dataset.value;
    });
});

// 睡眠滑块事件
document.getElementById('sleepHours').addEventListener('input', function() {
    document.getElementById('sleepValue').textContent = this.value;
});

// 标签切换
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
        
        // 如果切换到报表、历史记录、元气值或日志，刷新数据
        if (this.dataset.tab === 'report') {
            generateReport();
        } else if (this.dataset.tab === 'history') {
            loadHistory();
            loadVitalityHistory();
        } else if (this.dataset.tab === 'vitality') {
            loadVitality();
        } else if (this.dataset.tab === 'log') {
            loadLogs();
        } else if (this.dataset.tab === 'input') {
            // 切换到数据录入页面时重置表单，但保持编辑状态
            resetInputForm(true);
        }
    });
});

// 重置数据录入表单
function resetInputForm(keepEditState = false) {
    console.log('resetInputForm called, keepEditState:', keepEditState);
    
    // 设置日期为今天
    const recordDate = document.getElementById('recordDate');
    if (recordDate) {
        const today = new Date().toISOString().split('T')[0];
        recordDate.value = today;
    }
    
    // 重置所有选择框
    document.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
    });
    
    // 重置滑块
    const sleepHours = document.getElementById('sleepHours');
    const sleepValue = document.getElementById('sleepValue');
    if (sleepHours) sleepHours.value = 7;
    if (sleepValue) sleepValue.textContent = '7';
    
    // 重置运动选择
    document.querySelectorAll('.exercise-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const parentLabel = checkbox.closest('.dropdown-option');
        const durationSelect = parentLabel.querySelector('.exercise-duration-select');
        if (durationSelect) {
            durationSelect.style.display = 'none';
            durationSelect.value = '';
        }
    });
    
    // 重置运动分数
    const exercise = document.getElementById('exercise');
    const exerciseItems = document.getElementById('exerciseItems');
    if (exercise) exercise.value = '';
    if (exerciseItems) exerciseItems.value = '';
    
    // 重置零食选择
    document.querySelectorAll('.snack-option input, .snack-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 重置零食分数
    const snack = document.getElementById('snack');
    const snackItems = document.getElementById('snackItems');
    if (snack) snack.value = '';
    if (snackItems) snackItems.value = '';
    
    // 重置家务选择
    document.querySelectorAll('.chore-option input, .chore-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const parentLabel = checkbox.closest('.dropdown-option');
        
        // 隐藏并清空时长选择框
        const durationSelect = parentLabel.querySelector('.chore-duration-select');
        if (durationSelect) {
            durationSelect.style.display = 'none';
            durationSelect.value = '';
        }
        
        // 同时隐藏并清空"其他"输入框
        if (checkbox.dataset.other === 'true') {
            const otherInput = parentLabel.querySelector('.other-input');
            if (otherInput) {
                otherInput.style.display = 'none';
                otherInput.value = '';
            }
        }
    });
    
    // 重置家务分数
    const chore = document.getElementById('chore');
    const choreItems = document.getElementById('choreItems');
    if (chore) chore.value = '';
    if (choreItems) choreItems.value = '';
    
    // 重置心情按钮状态
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('mood').value = '0';
    
    // 重置餐食选择
    document.getElementById('breakfast').value = '0';
    document.getElementById('lunch').value = '0';
    document.getElementById('dinner').value = '0';
    
    // 重置睡眠相关
    document.getElementById('sleepQuality').value = '0';
    document.getElementById('sleepTime').value = '';
    document.getElementById('wakeTime').value = '';
    
    // 重置身体状况
    document.getElementById('health').value = '0';
    document.getElementById('healthDetail').value = '';
    
    // 重置备注
    const notes = document.getElementById('notes');
    if (notes) notes.value = '';
    
    // 只有在不保持编辑状态时才重置编辑状态
    if (!keepEditState) {
        editingRecordId = null;
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.textContent = '保存';
        }
    }
    
    // 更新下拉框显示状态
    if (typeof calculateExerciseScore === 'function') {
        calculateExerciseScore();
    }
    if (typeof calculateSnackScore === 'function') {
        calculateSnackScore();
    }
    if (typeof calculateChoreScore === 'function') {
        calculateChoreScore();
    }
}

// 计算运动总分
function calculateExerciseScore() {
    const checkboxes = document.querySelectorAll('.exercise-checkbox:checked');
    let totalScore = 0;
    const selectedItems = [];
    
    checkboxes.forEach(checkbox => {
        totalScore += parseInt(checkbox.dataset.score);
        const parentLabel = checkbox.closest('.dropdown-option');
        const durationSelect = parentLabel.querySelector('.exercise-duration-select');
        const duration = durationSelect ? durationSelect.value : '';
        
        selectedItems.push({
            name: checkbox.dataset.name,
            score: parseInt(checkbox.dataset.score),
            duration: duration
        });
    });
    
    // 如果没有选中任何运动，但exercise字段已有值（编辑旧记录时），保留原有分数
    if (selectedItems.length === 0) {
        const existingExercise = document.getElementById('exercise').value;
        if (existingExercise && parseInt(existingExercise) !== 0) {
            totalScore = parseInt(existingExercise);
        }
    }
    
    // 更新隐藏字段
    document.getElementById('exercise').value = totalScore;
    document.getElementById('exerciseItems').value = JSON.stringify(selectedItems);
    
    // 更新下拉框显示
    const trigger = document.getElementById('exerciseDropdown');
    const selectedText = document.getElementById('exerciseSelected');
    const selectedCount = document.getElementById('exerciseDropdownSelectedCount');
    const dropdownScore = document.getElementById('exerciseDropdownScore');
    
    if (selectedItems.length === 0) {
        if (totalScore !== 0) {
            selectedText.textContent = `运动得分 (+${totalScore > 0 ? '+' : ''}${totalScore}分)`;
            trigger.classList.add('has-selection');
        } else {
            selectedText.textContent = '请选择运动';
            trigger.classList.remove('has-selection');
        }
    } else {
        // 构建显示文本，包含每个运动及其时长
        const displayItems = selectedItems.map(item => {
            const durationText = item.duration ? `(${formatDuration(item.duration)})` : '';
            return `${item.name}${durationText}`;
        });
        
        selectedText.textContent = `${displayItems.join(' + ')} (+${totalScore > 0 ? '+' : ''}${totalScore}分)`;
        trigger.classList.add('has-selection');
    }
    
    // 更新下拉框内部的统计
    selectedCount.textContent = selectedItems.length;
    dropdownScore.textContent = `${totalScore > 0 ? '+' : ''}${totalScore}`;
}

// 绑定运动选择事件
document.querySelectorAll('.exercise-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const parentLabel = this.closest('.dropdown-option');
        const durationSelect = parentLabel.querySelector('.exercise-duration-select');
        
        if (this.checked) {
            durationSelect.style.display = 'inline-block';
        } else {
            durationSelect.style.display = 'none';
            durationSelect.value = '';
        }
        
        calculateExerciseScore();
    });
});

// 绑定运动时长选择事件
document.querySelectorAll('.exercise-duration-select').forEach(select => {
    select.addEventListener('change', calculateExerciseScore);
});

// 更新运动下拉框位置
function updateExerciseDropdownPosition() {
    const dropdown = document.getElementById('exerciseDropdownContent');
    const trigger = document.getElementById('exerciseDropdown');
    
    if (dropdown.classList.contains('open') && trigger) {
        const rect = trigger.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = (rect.bottom + 8) + 'px';
        dropdown.style.width = rect.width + 'px';
    }
}

// 运动下拉框切换
document.getElementById('exerciseDropdown').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('exerciseDropdownContent');
    const trigger = document.getElementById('exerciseDropdown');
    
    dropdown.classList.toggle('open');
    trigger.classList.toggle('open');
    
    if (dropdown.classList.contains('open')) {
        updateExerciseDropdownPosition();
    } else {
        dropdown.style.left = 'auto';
        dropdown.style.top = 'auto';
        dropdown.style.width = 'auto';
    }
});

// 页面滚动时更新运动下拉框位置
window.addEventListener('scroll', updateExerciseDropdownPosition);

// 窗口大小改变时更新运动下拉框位置
window.addEventListener('resize', updateExerciseDropdownPosition);

// 点击外部关闭运动下拉框
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('exerciseDropdownContent');
    const trigger = document.getElementById('exerciseDropdown');
    
    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
    }
});

// 清除运动选择
document.getElementById('clearExerciseSelection').addEventListener('click', function() {
    document.querySelectorAll('.exercise-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const parentLabel = checkbox.closest('.dropdown-option');
        const durationSelect = parentLabel.querySelector('.exercise-duration-select');
        if (durationSelect) {
            durationSelect.style.display = 'none';
            durationSelect.value = '';
        }
    });
    // 先清空隐藏字段值，再计算分数
    const exercise = document.getElementById('exercise');
    const exerciseItems = document.getElementById('exerciseItems');
    if (exercise) exercise.value = '';
    if (exerciseItems) exerciseItems.value = '';
    calculateExerciseScore();
});

// 主题切换
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const theme = this.dataset.theme;
        document.documentElement.classList.remove('theme-song', 'theme-forest', 'theme-coffee');
        
        if (theme === 'song') {
            document.documentElement.classList.add('theme-song');
        } else if (theme === 'forest') {
            document.documentElement.classList.add('theme-forest');
        } else if (theme === 'coffee') {
            document.documentElement.classList.add('theme-coffee');
        }
        
        // 保存主题设置到localStorage
        localStorage.setItem('energyTheme', theme);
    });
});

// 加载保存的主题
// 天气图标映射
const WEATHER_ICONS = {
    'sunny': '☀️',
    'clear': '🌞',
    'partly-cloudy': '⛅',
    'cloudy': '☁️',
    'overcast': '☁️',
    'rain': '🌧️',
    'shower': '🌧️',
    'thunder': '⛈️',
    'snow': '❄️',
    'fog': '🌫️',
    'mist': '🌫️'
};

// 获取天气图标（适配Open-Meteo weathercode）
function getWeatherIcon(weatherCode) {
    // 0: 晴朗
    if (weatherCode === 0) return WEATHER_ICONS['sunny'];
    // 1, 2, 3: 多云（1: 大部晴朗, 2: 部分多云, 3: 阴天）
    if (weatherCode === 1) return WEATHER_ICONS['sunny'];
    if (weatherCode === 2) return WEATHER_ICONS['partly-cloudy'];
    if (weatherCode === 3) return WEATHER_ICONS['overcast'];
    // 45, 48: 雾
    if (weatherCode === 45 || weatherCode === 48) return WEATHER_ICONS['fog'];
    // 51-55: 毛毛雨
    if (weatherCode >= 51 && weatherCode <= 55) return WEATHER_ICONS['shower'];
    // 61-65: 雨
    if (weatherCode >= 61 && weatherCode <= 65) return WEATHER_ICONS['rain'];
    // 71-77: 雪
    if (weatherCode >= 71 && weatherCode <= 77) return WEATHER_ICONS['snow'];
    // 80-82: 阵雨
    if (weatherCode >= 80 && weatherCode <= 82) return WEATHER_ICONS['shower'];
    // 85-86: 阵雪
    if (weatherCode >= 85 && weatherCode <= 86) return WEATHER_ICONS['snow'];
    // 95-99: 雷暴
    if (weatherCode >= 95 && weatherCode <= 99) return WEATHER_ICONS['thunder'];
    return WEATHER_ICONS['cloudy'];
}

// 获取天气描述（适配Open-Meteo weathercode）
function getWeatherDescription(weatherCode) {
    if (weatherCode === 0) return '晴天';
    if (weatherCode === 1) return '大部晴朗';
    if (weatherCode === 2) return '多云';
    if (weatherCode === 3) return '阴天';
    if (weatherCode === 45 || weatherCode === 48) return '雾';
    if (weatherCode >= 51 && weatherCode <= 55) return '毛毛雨';
    if (weatherCode >= 61 && weatherCode <= 65) return '雨';
    if (weatherCode >= 71 && weatherCode <= 77) return '雪';
    if (weatherCode >= 80 && weatherCode <= 82) return '阵雨';
    if (weatherCode >= 85 && weatherCode <= 86) return '阵雪';
    if (weatherCode >= 95 && weatherCode <= 99) return '雷暴';
    return '多云';
}

// 获取天气数据（使用Open-Meteo免费API，无需API Key）
async function fetchWeather(latitude, longitude, date) {
    console.log('=== 获取天气数据 ===');
    console.log('坐标:', latitude, longitude);
    console.log('日期:', date);
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        let url;
        
        if (date === today) {
            // 当前天气
            url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        } else {
            // 历史天气
            url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&daily=temperature_2m_mean,weathercode&timezone=auto`;
        }
        
        console.log('请求URL:', url);
        
        const response = await fetch(url);
        console.log('响应状态:', response.status);
        
        if (!response.ok) {
            console.error('API请求失败:', response.statusText);
            return null;
        }
        
        const data = await response.json();
        console.log('返回数据:', data);
        
        if (date === today && data.current_weather) {
            // 当前天气
            const weatherCode = data.current_weather.weathercode;
            return {
                temp: Math.round(data.current_weather.temperature),
                icon: getWeatherIcon(weatherCode),
                description: getWeatherDescription(weatherCode)
            };
        } else if (data.daily && data.daily.weathercode && data.daily.weathercode.length > 0) {
            // 历史天气
            const weatherCode = data.daily.weathercode[0];
            const temp = data.daily.temperature_2m_mean[0];
            return {
                temp: Math.round(temp),
                icon: getWeatherIcon(weatherCode),
                description: getWeatherDescription(weatherCode)
            };
        }
    } catch (error) {
        console.error('获取天气失败:', error);
        // 天气获取失败不影响其他功能，返回默认值
        return {
            temp: '--',
            icon: '🌤️',
            description: '天气获取失败'
        };
    }
    
    return null;
}

// 更新天气显示
async function updateWeatherDisplay(date) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    if (!weatherDisplay) return;
    
    const weatherIcon = weatherDisplay.querySelector('.weather-icon');
    const weatherText = weatherDisplay.querySelector('.weather-text');
    
    // 获取保存的位置信息
    const savedLocation = localStorage.getItem('weatherLocation');
    let latitude = 31.2304; // 默认上海纬度
    let longitude = 121.4737; // 默认上海经度
    
    if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        latitude = loc.latitude;
        longitude = loc.longitude;
    }
    
    try {
        const weather = await fetchWeather(latitude, longitude, date);
        
        if (weather) {
            weatherIcon.textContent = weather.icon;
            weatherText.textContent = `${weather.description} ${weather.temp}°C`;
        } else {
            weatherIcon.textContent = '🌤️';
            weatherText.textContent = '暂无天气数据';
        }
    } catch (error) {
        weatherIcon.textContent = '🌤️';
        weatherText.textContent = '获取天气失败';
    }
}

// 获取用户位置
function getUserLocation() {
    const recordDate = document.getElementById('recordDate');
    const currentDate = recordDate ? recordDate.value : new Date().toISOString().split('T')[0];
    
    // 先尝试使用保存的位置或默认位置显示天气
    updateWeatherDisplay(currentDate);
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                localStorage.setItem('weatherLocation', JSON.stringify(location));
                
                // 使用真实位置更新天气显示
                updateWeatherDisplay(currentDate);
            },
            function(error) {
                console.log('无法获取位置，使用默认位置:', error.message);
            }
        );
    } else {
        console.log('浏览器不支持地理定位');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 初始化天气显示
    getUserLocation();
    
    // 日期选择改变时更新天气
    const recordDate = document.getElementById('recordDate');
    if (recordDate) {
        recordDate.addEventListener('change', function() {
            updateWeatherDisplay(this.value);
        });
    }
    
    const savedTheme = localStorage.getItem('energyTheme') || 'default';
    
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    
    if (savedTheme === 'song') {
        document.documentElement.classList.add('theme-song');
        document.getElementById('theme-song').classList.add('active');
    } else if (savedTheme === 'forest') {
        document.documentElement.classList.add('theme-forest');
        document.getElementById('theme-forest').classList.add('active');
    } else if (savedTheme === 'coffee') {
        document.documentElement.classList.add('theme-coffee');
        document.getElementById('theme-coffee').classList.add('active');
    } else {
        document.getElementById('theme-default').classList.add('active');
    }
});

// 计算能量分数
function calculateEnergy(record) {
    let total = 0;
    
    // 零食分数（直接使用表单中已计算好的总分）
    const snackScore = parseInt(record.snack) || 0;
    
    // 三餐分数（包含零食）
    const breakfast = parseInt(record.breakfast) || 0;
    const lunch = parseInt(record.lunch) || 0;
    const dinner = parseInt(record.dinner) || 0;
    const mealScore = (ENERGY_CONFIG.meal[breakfast] || 0) + 
                     (ENERGY_CONFIG.meal[lunch] || 0) + 
                     (ENERGY_CONFIG.meal[dinner] || 0) +
                     snackScore;
    total += mealScore;
    
    // 运动分数
    const exercise = parseInt(record.exercise) || 0;
    total += ENERGY_CONFIG.exercise[exercise] || 0;
    
    // 心情分数
    const mood = parseInt(record.mood) || 0;
    total += ENERGY_CONFIG.mood[mood] || 0;
    
    // 睡眠分数（只考虑质量感觉）
    const sleepQuality = parseInt(record.sleepQuality) || 0;
    const sleepScore = ENERGY_CONFIG.sleepQuality[sleepQuality] || 0;
    total += sleepScore;
    
    // 家务分数
    const chore = parseInt(record.chore) || 0;
    total += ENERGY_CONFIG.chore[chore] || 0;
    
    // 身体状况分数
    const health = parseInt(record.health) || 0;
    total += ENERGY_CONFIG.health[health] || 0;
    
    return {
        total,
        meal: mealScore,
        snack: snackScore,
        exercise: ENERGY_CONFIG.exercise[exercise] || 0,
        mood: ENERGY_CONFIG.mood[mood] || 0,
        sleep: sleepScore,
        chore: ENERGY_CONFIG.chore[chore] || 0,
        health: ENERGY_CONFIG.health[health] || 0
    };
}

// 显示自定义确认对话框
function showConfirmDialog(title, message, onConfirm, onCancel) {
    const existingDialog = document.querySelector('.custom-confirm-dialog');
    if (existingDialog) existingDialog.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    
    const dialog = document.createElement('div');
    dialog.className = 'custom-confirm-dialog';
    dialog.style.cssText = 'background:white;border-radius:12px;padding:24px;max-width:320px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,0.2);text-align:center;';
    
    dialog.innerHTML = `
        <h3 style="margin:0 0 12px 0;color:#333;">${title}</h3>
        <p style="margin:0 0 20px 0;color:#666;">${message}</p>
        <div style="display:flex;gap:12px;justify-content:center;">
            <button class="cancel-btn" style="flex:1;padding:10px 20px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;cursor:pointer;font-size:14px;">取消</button>
            <button class="confirm-btn" style="flex:1;padding:10px 20px;border:none;border-radius:6px;background:#4CAF50;color:white;cursor:pointer;font-size:14px;">确定</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    dialog.querySelector('.cancel-btn').addEventListener('click', function() {
        overlay.remove();
        if (onCancel) onCancel();
    });
    
    dialog.querySelector('.confirm-btn').addEventListener('click', function() {
        overlay.remove();
        if (onConfirm) onConfirm();
    });
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    });
}

// 保存记录
function saveRecord() {
    console.log('=== saveRecord 函数被调用 ===');
    console.log('editingRecordId:', editingRecordId);
    
    const recordDate = document.getElementById('recordDate');
    const breakfast = document.getElementById('breakfast');
    const lunch = document.getElementById('lunch');
    const dinner = document.getElementById('dinner');
    const snack = document.getElementById('snack');
    const snackItems = document.getElementById('snackItems');
    const exercise = document.getElementById('exercise');
    const exerciseItems = document.getElementById('exerciseItems');
    const mood = document.getElementById('mood');
    const sleepHours = document.getElementById('sleepHours');
    const sleepQuality = document.getElementById('sleepQuality');
    const sleepTime = document.getElementById('sleepTime');
    const wakeTime = document.getElementById('wakeTime');
    const chore = document.getElementById('chore');
    const choreItems = document.getElementById('choreItems');
    const health = document.getElementById('health');
    const healthDetail = document.getElementById('healthDetail');
    const notes = document.getElementById('notes');
    
    if (!recordDate || !breakfast || !lunch || !dinner) {
        console.error('表单元素未找到');
        return;
    }
    
    const record = {
        id: editingRecordId || Date.now().toString(),
        date: recordDate.value,
        breakfast: breakfast.value,
        lunch: lunch.value,
        dinner: dinner.value,
        snack: snack.value,
        snackItems: snackItems ? snackItems.value : '',
        exercise: exercise.value,
        exerciseItems: exerciseItems ? exerciseItems.value : '',
        mood: mood.value,
        sleepHours: sleepHours.value,
        sleepQuality: sleepQuality.value,
        sleepTime: sleepTime.value,
        wakeTime: wakeTime.value,
        chore: chore.value,
        choreItems: choreItems ? choreItems.value : '[]',
        health: health.value,
        healthDetail: healthDetail ? healthDetail.value : '',
        notes: notes ? notes.value : '',
        timestamp: Date.now()
    };
    
    // 计算能量
    const energy = calculateEnergy(record);
    record.energy = energy.total;
    record.breakdown = energy;
    
    // 获取现有记录
    let records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    console.log('当前记录数量:', records.length);
    
    let isNewRecord = !editingRecordId;
    let oldEnergy = 0;
    let recordToOverwrite = null;
    
    // 检查是否有冲突需要先确认
    if (editingRecordId) {
        // 编辑模式
        console.log('进入编辑模式');
        const editIndex = records.findIndex(r => r.id === editingRecordId);
        
        if (editIndex >= 0) {
            const oldRecord = records[editIndex];
            oldEnergy = oldRecord.energy || 0;
            
            // 检查日期是否改变且新日期已有记录
            if (oldRecord.date !== record.date) {
                const existingRecordWithNewDate = records.find(r => 
                    r.date === record.date && r.id !== editingRecordId
                );
                
                if (existingRecordWithNewDate) {
                    recordToOverwrite = existingRecordWithNewDate;
                }
            }
        }
    } else {
        // 新增模式：检查当天是否已有记录
        const existingIndex = records.findIndex(r => r.date === record.date);
        if (existingIndex >= 0) {
            recordToOverwrite = records[existingIndex];
            oldEnergy = recordToOverwrite.energy || 0;
        }
    }
    
    // 如果有冲突，先询问是否覆盖
    if (recordToOverwrite) {
        showConfirmDialog(
            '记录冲突',
            `日期 ${record.date} 已存在记录，是否覆盖？`,
            function() {
                // 用户确认覆盖，使用要覆盖记录的id
                record.id = recordToOverwrite.id;
                isNewRecord = false;
                // 执行保存
                executeSave(record, energy, records, oldEnergy, isNewRecord);
            },
            function() {
                // 用户取消
                console.log('用户取消覆盖');
            }
        );
    } else {
        // 没有冲突，询问是否保存（编辑模式）或者直接保存（新增模式）
        if (editingRecordId) {
            showConfirmDialog(
                '确认更新',
                '确定要更新这条记录吗？',
                function() {
                    // 用户确认更新，执行保存
                    executeSave(record, energy, records, oldEnergy, isNewRecord);
                },
                function() {
                    // 用户取消
                    console.log('用户取消更新');
                }
            );
        } else {
            // 新增模式直接保存
            executeSave(record, energy, records, 0, true);
        }
    }
}

// 执行保存（联动都在这里）
function executeSave(record, energy, records, oldEnergy, isNewRecord) {
    console.log('=== 执行保存 ===');
    
    let alertMessage = '';
    
    // 查找要更新的记录索引
    let editIndex = records.findIndex(r => r.id === record.id);
    
    if (editIndex >= 0) {
        // 更新现有记录
        records[editIndex] = record;
        alertMessage = isNewRecord ? '记录覆盖成功！' : '记录更新成功！';
        
        // 更新元气值
        const currentVitality = getVitality();
        const vitalityChange = energy.total - oldEnergy;
        const newVitality = Math.max(0, currentVitality + vitalityChange);
        localStorage.setItem('vitality', newVitality.toString());
        console.log('编辑模式更新元气值:', currentVitality, '→', newVitality, '(变化:', vitalityChange, ')');
        
        // 记录元气值变化
        if (vitalityChange !== 0) {
            const changeType = vitalityChange > 0 ? 'earn' : 'spend';
            const absChange = Math.abs(vitalityChange);
            addVitalityRecord(changeType, absChange, isNewRecord ? '记录覆盖' : '记录更新');
        }
        
        // 添加日志
        if (isNewRecord) {
            addLog(record.date, 'add', `新增能量记录（${energy.total}分）`);
        } else {
            addLog(record.date, 'update', `更新能量记录（${energy.total}分）`);
        }
        
        // 刷新元气值页面
        if (document.getElementById('vitality')?.classList.contains('active')) {
            loadVitality();
        }
        
        // 刷新元气值历史记录
        if (document.getElementById('history')?.classList.contains('active')) {
            loadVitalityHistory();
        }
    } else {
        // 新增记录
        records.push(record);
        alertMessage = '记录保存成功！今日能量值：' + energy.total;
        addVitality(energy.total);
        addLog(record.date, 'add', `新增能量记录（${energy.total}分）`);
    }
    
    // 保存到localStorage
    localStorage.setItem('energyRecords', JSON.stringify(records));
    
    // 显示成功提示
    alert(alertMessage);
    
    // 重置状态
    editingRecordId = null;
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.textContent = '💾 保存记录';
    
    // 刷新元气值页面
    if (document.getElementById('vitality')?.classList.contains('active')) {
        loadVitality();
    }
    
    // 显示书签弹窗（新增记录时）
    setTimeout(function() {
        showBookmarkModal(record, energy);
    }, 2500);
    
    // 重置表单
    resetInputForm();
    
    console.log('=== 保存完成 ===');
}

// 绑定保存按钮事件
document.addEventListener('DOMContentLoaded', function() {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            // 阻止表单默认提交行为
            e.preventDefault();
            e.stopPropagation();
            saveRecord();
        });
        console.log('保存按钮事件已绑定');
    } else {
        console.error('保存按钮未找到');
    }
    
    // 绑定取消按钮事件
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            cancelEdit();
        });
        console.log('取消按钮事件已绑定');
    } else {
        console.error('取消按钮未找到');
    }

    // 清空数据按钮事件已在 HTML 中通过 onclick 绑定

    // 绑定跳转到历史记录按钮事件
    const goToHistoryBtn = document.getElementById('goToHistoryBtn');
    if (goToHistoryBtn) {
        goToHistoryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // 切换到历史记录标签
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('history').classList.add('active');
            loadHistory();
            loadVitalityHistory();
            // 滚动到页面顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        console.log('跳转到历史记录按钮事件已绑定');
    } else {
        console.error('跳转到历史记录按钮未找到');
    }

    // 绑定跳转到更新日志按钮事件
    const goToLogBtn = document.getElementById('goToLogBtn');
    if (goToLogBtn) {
        goToLogBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // 切换到更新日志标签
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('log').classList.add('active');
            // 滚动到页面顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        console.log('跳转到更新日志按钮事件已绑定');
    } else {
        console.error('跳转到更新日志按钮未找到');
    }
});

// 取消编辑/重置表单
function cancelEdit() {
    console.log('=== 取消编辑 ===');
    
    // 如果正在编辑，重置编辑状态
    if (editingRecordId) {
        editingRecordId = null;
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) saveBtn.textContent = '💾 保存记录';
    }
    
    // 重置表单
    resetInputForm();
    
    console.log('=== 已取消编辑 ===');
}

// 使用自定义确认对话框
function showCustomConfirm(message, onConfirm) {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 320px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        text-align: center;
    `;
    
    dialog.innerHTML = `
        <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">${message}</p>
        <div style="display: flex; gap: 10px;">
            <button style="flex: 1; padding: 10px 20px; border: 1px solid #ddd; border-radius: 6px; background: #f5f5f5; cursor: pointer; font-size: 14px;" onclick="document.querySelector('.custom-confirm-overlay').remove();">取消</button>
            <button style="flex: 1; padding: 10px 20px; border: none; border-radius: 6px; background: #4CAF50; color: white; cursor: pointer; font-size: 14px;" onclick="document.querySelector('.custom-confirm-overlay').remove(); if(window.customConfirmCallback) { window.customConfirmCallback(); }">确定</button>
        </div>
    `;
    
    overlay.className = 'custom-confirm-overlay';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

// 测试确认对话框函数（使用自定义对话框）
window.testConfirm = function() {
    console.log('=== testConfirm 被调用 ===');
    window.customConfirmCallback = function() {
        console.log('用户点击了确定');
        alert('点击了确定');
        window.customConfirmCallback = null;
    };
    showCustomConfirm('测试确认对话框，点击取消看看是否正常工作');
};

// 显示清空数据确认对话框
window.showClearDataConfirm = function() {
    console.log('=== showClearDataConfirm 被调用 ===');
    window.customConfirmCallback = function() {
        console.log('用户点击了确定，开始清空数据');
        window.performClearData();
        window.customConfirmCallback = null;
    };
    showCustomConfirm('⚠️ 警告：此操作将清空所有历史记录，包括所有日期的能量记录、参考能量值、元气值和书签数据。此操作不可撤销！确定要继续吗？');
};

// 将函数绑定到 window 对象，确保 onclick 可以调用
window.handleClearData = function() {
    console.log('=== handleClearData 被调用 ===');
    console.log('当前时间:', new Date().toLocaleString());
    
    // 记录当前数据量
    const beforeRecords = localStorage.getItem('energyRecords');
    console.log('清空前数据量:', beforeRecords ? JSON.parse(beforeRecords).length : 0);
    
    // 直接在这里处理确认逻辑
    const confirmed = window.confirm('⚠️ 警告：此操作将清空所有历史记录，包括所有日期的能量记录、参考能量值、元气值和书签数据。此操作不可撤销！确定要继续吗？');
    
    console.log('用户确认结果:', confirmed, '类型:', typeof confirmed);
    console.log('confirmed === false:', confirmed === false);
    console.log('!confirmed:', !confirmed);
    
    if (!confirmed) {
        console.log('===== 用户点击了取消，不执行清空操作 =====');
        // 再次确认数据没有被清空
        const afterRecords = localStorage.getItem('energyRecords');
        console.log('取消后数据量:', afterRecords ? JSON.parse(afterRecords).length : 0);
        return;
    }
    
    // 确认后才调用实际的清空函数
    console.log('===== 用户点击了确定，开始清空数据 =====');
    performClearData();
};

// 实际执行清空数据的函数（绑定到 window 对象）
window.performClearData = function() {
    console.log('=== performClearData 开始执行 ===');
    
    // 记录清空前的数据量
    const beforeRecords = localStorage.getItem('energyRecords');
    console.log('清空前数据量:', beforeRecords ? JSON.parse(beforeRecords).length : 0);
    
    // 清空 localStorage 中的所有数据（保留更新日志）
    localStorage.removeItem('energyRecords');
    localStorage.removeItem('referenceEnergy');
    localStorage.removeItem('bookmarks');
    localStorage.removeItem('vitality');
    localStorage.removeItem('accumulatedDates');
    localStorage.removeItem('vitalityRecords');
    localStorage.removeItem('wishes');
    localStorage.removeItem('energyBenchmark');
    
    // 记录清空后的数据量
    const afterRecords = localStorage.getItem('energyRecords');
    console.log('清空后数据量:', afterRecords ? JSON.parse(afterRecords).length : 0);
    
    // 重置全局变量
    energyRecords = [];
    referenceEnergy = { breakfast: 50, lunch: 50, dinner: 50, sleep: 8 };
    vitality = 0;
    
    // 重置表单
    resetInputForm();
    
    // 刷新所有页面内容
    loadHistory();
    loadVitality();
    loadVitalityHistory();
    
    // 强制刷新报表分析页面（无论当前是否在报表页面）
    console.log('强制刷新报表...');
    generateReport();
    
    // 刷新日历
    const records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    console.log('刷新日历，记录数:', records.length);
    generateCalendar(records);
    
    alert('✅ 所有数据已清空！页面将自动刷新...');
    console.log('=== 已清空所有数据，准备刷新页面 ===');
    
    // 延迟一秒后刷新页面，确保用户能看到提示
    setTimeout(function() {
        window.location.reload();
    }, 1000);
}

// 生成报表
function generateReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    // 如果没有选择日期范围，尝试获取默认日期范围
    if (!startDate || !endDate) {
        console.log('日期范围为空，使用默认范围');
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        document.getElementById('startDate').value = weekAgo.toISOString().split('T')[0];
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        return generateReport(); // 递归调用
    }
    
    const records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    
    // 筛选日期范围内的记录
    const filteredRecords = records.filter(r => r.date >= startDate && r.date <= endDate);
    
    // 获取选择的对比期间类型
    const compareType = document.getElementById('comparePeriod').value;
    
    // 计算对比期间的日期范围
    const compareDates = getCompareDates(startDate, endDate, compareType);
    const prevStartStr = compareDates.start;
    const prevEndStr = compareDates.end;
    
    // 筛选对比期间的记录
    const prevRecords = records.filter(r => r.date >= prevStartStr && r.date <= prevEndStr);
    
    // 调试信息
    console.log('对比类型:', compareType);
    console.log('当前期间:', startDate, '至', endDate);
    console.log('对比期间:', prevStartStr, '至', prevEndStr);
    console.log('对比期间记录数:', prevRecords.length);
    
    if (filteredRecords.length === 0) {
        document.getElementById('avgEnergy').textContent = '0';
        document.getElementById('maxEnergy').textContent = '0';
        document.getElementById('minEnergy').textContent = '0';
        document.getElementById('recordCount').textContent = '0';
        document.getElementById('avgMeal').textContent = '0';
        document.getElementById('avgExercise').textContent = '0';
        document.getElementById('avgMood').textContent = '0';
        document.getElementById('avgSleep').textContent = '0';
        document.getElementById('avgChore').textContent = '0';
        document.getElementById('avgHealth').textContent = '0';
        
        // 隐藏对比变化
        hideAllChanges();
        
        // 重置打卡统计
        document.getElementById('exerciseDays').textContent = '0';
        document.getElementById('exerciseRate').textContent = '0%';
        document.getElementById('choreDays').textContent = '0';
        document.getElementById('choreRate').textContent = '0%';
        document.getElementById('noSnackDays').textContent = '0';
        document.getElementById('noSnackRate').textContent = '0%';
        
        // 重置时间统计
        document.getElementById('exerciseTimeStat').style.display = 'none';
        document.getElementById('exerciseTotalTime').textContent = '0';
        document.getElementById('choreTimeStat').style.display = 'none';
        document.getElementById('choreTotalTime').textContent = '0';
        const exerciseDetailList = document.getElementById('exerciseDetailList');
        if (exerciseDetailList) {
            exerciseDetailList.innerHTML = '<p style="color: #999; text-align: center;">暂无运动记录</p>';
        }
        const choreDetailList = document.getElementById('choreDetailList');
        if (choreDetailList) {
            choreDetailList.innerHTML = '<p style="color: #999; text-align: center;">暂无家务记录</p>';
        }
        
        // 更新图表
        updateChart([]);
        return;
    }
    
    // 计算统计数据
    const energies = filteredRecords.map(r => r.energy);
    const avgEnergy = Math.round(energies.reduce((a, b) => a + b, 0) / energies.length);
    const maxEnergy = Math.max(...energies);
    const minEnergy = Math.min(...energies);
    
    // 更新概览卡片
    document.getElementById('avgEnergy').textContent = avgEnergy;
    document.getElementById('maxEnergy').textContent = maxEnergy;
    document.getElementById('minEnergy').textContent = minEnergy;
    document.getElementById('recordCount').textContent = filteredRecords.length;
    
    // 更新参考能量值显示
    const benchmark = parseInt(localStorage.getItem('energyBenchmark') || '80');
    document.getElementById('benchmarkDisplay').textContent = benchmark;
    
    // 计算各维度平均值（meal已包含零食分数）
    const avgMeal = Math.round(filteredRecords.reduce((sum, r) => sum + (r.breakdown?.meal || 0), 0) / filteredRecords.length);
    const avgSnack = Math.round(filteredRecords.reduce((sum, r) => sum + (r.breakdown?.snack || 0), 0) / filteredRecords.length);
    const avgExercise = Math.round(filteredRecords.reduce((sum, r) => sum + (r.breakdown?.exercise || 0), 0) / filteredRecords.length);
    const avgMood = Math.round(filteredRecords.reduce((sum, r) => sum + (r.breakdown?.mood || 0), 0) / filteredRecords.length);
    const avgSleep = Math.round(filteredRecords.reduce((sum, r) => sum + (r.breakdown?.sleep || 0), 0) / filteredRecords.length);
    const avgChore = Math.round(filteredRecords.reduce((sum, r) => sum + (r.breakdown?.chore || 0), 0) / filteredRecords.length);
    const avgHealth = Math.round(filteredRecords.reduce((sum, r) => sum + (r.breakdown?.health || 0), 0) / filteredRecords.length);
    
    document.getElementById('avgMeal').textContent = avgMeal;
    document.getElementById('avgSnack').textContent = avgSnack;
    document.getElementById('avgExercise').textContent = avgExercise;
    document.getElementById('avgMood').textContent = avgMood;
    document.getElementById('avgSleep').textContent = avgSleep;
    document.getElementById('avgChore').textContent = avgChore;
    document.getElementById('avgHealth').textContent = avgHealth;
    
    // 初始化对比期数据
    let prevAvgMeal = 0, prevAvgExercise = 0, prevAvgMood = 0, prevAvgSleep = 0, prevAvgChore = 0, prevAvgHealth = 0;
    
    // 计算并显示对比变化
    if (prevRecords.length > 0) {
        prevAvgMeal = Math.round(prevRecords.reduce((sum, r) => sum + (r.breakdown?.meal || 0), 0) / prevRecords.length);
        const prevAvgSnack = Math.round(prevRecords.reduce((sum, r) => sum + (r.breakdown?.snack || 0), 0) / prevRecords.length);
        prevAvgExercise = Math.round(prevRecords.reduce((sum, r) => sum + (r.breakdown?.exercise || 0), 0) / prevRecords.length);
        prevAvgMood = Math.round(prevRecords.reduce((sum, r) => sum + (r.breakdown?.mood || 0), 0) / prevRecords.length);
        prevAvgSleep = Math.round(prevRecords.reduce((sum, r) => sum + (r.breakdown?.sleep || 0), 0) / prevRecords.length);
        prevAvgChore = Math.round(prevRecords.reduce((sum, r) => sum + (r.breakdown?.chore || 0), 0) / prevRecords.length);
        prevAvgHealth = Math.round(prevRecords.reduce((sum, r) => sum + (r.breakdown?.health || 0), 0) / prevRecords.length);
        
        showChange('changeMeal', avgMeal - prevAvgMeal);
        showChange('changeSnack', avgSnack - prevAvgSnack);
        showChange('changeExercise', avgExercise - prevAvgExercise);
        showChange('changeMood', avgMood - prevAvgMood);
        showChange('changeSleep', avgSleep - prevAvgSleep);
        showChange('changeChore', avgChore - prevAvgChore);
        
        // 更新对比期间标签显示
        document.getElementById('comparePeriodLabel').textContent = `(${prevStartStr} ~ ${prevEndStr})`;
    } else {
        hideAllChanges();
        // 更新对比期间标签显示（无数据）
        document.getElementById('comparePeriodLabel').textContent = '(无数据)';
    }
    
    // 生成能量解读
    generateAnalysis(avgEnergy, benchmark, filteredRecords, {
        avgMeal, avgSnack, avgExercise, avgMood, avgSleep, avgChore, avgHealth
    });
    
    // 绘制雷达图
    drawRadarChart(avgMeal, avgExercise, avgMood, avgSleep, avgChore, avgHealth,
        prevAvgMeal, prevAvgExercise, prevAvgMood, prevAvgSleep, prevAvgChore, prevAvgHealth);
    
    // 生成对比分析
    generateComparison(filteredRecords, avgEnergy);
    
    // 计算打卡统计
    const exerciseRecords = filteredRecords.filter(r => {
        const exercise = parseInt(r.exercise) || 0;
        return exercise > 0;
    });
    const choreRecords = filteredRecords.filter(r => {
        const chore = parseInt(r.chore) || 0;
        return chore > 0;
    });
    
    const exerciseDays = exerciseRecords.length;
    const choreDays = choreRecords.length;
    const noSnackDays = filteredRecords.filter(r => !r.snack || parseInt(r.snack) === 0).length;
    const totalDays = filteredRecords.length;
    
    const exerciseRate = totalDays > 0 ? Math.round((exerciseDays / totalDays) * 100) : 0;
    const choreRate = totalDays > 0 ? Math.round((choreDays / totalDays) * 100) : 0;
    const noSnackRate = totalDays > 0 ? Math.round((noSnackDays / totalDays) * 100) : 0;
    
    document.getElementById('exerciseDays').textContent = exerciseDays;
    document.getElementById('exerciseRate').textContent = exerciseRate + '%';
    document.getElementById('choreDays').textContent = choreDays;
    document.getElementById('choreRate').textContent = choreRate + '%';
    document.getElementById('noSnackDays').textContent = noSnackDays;
    document.getElementById('noSnackRate').textContent = noSnackRate + '%';
    
    // 计算运动时长统计
    console.log('=== 计算运动时长统计 ===');
    calculateExerciseTimeStats(exerciseRecords);
    
    // 计算家务时长统计
    console.log('=== 计算家务时长统计 ===');
    calculateChoreTimeStats(choreRecords);
    
    // 生成日历
    generateCalendar(filteredRecords);
    
    // 更新图表
    updateChart(filteredRecords);
}

// 计算运动时长统计
function calculateExerciseTimeStats(exerciseRecords) {
    let totalMinutes = 0;
    let hasDurationData = false;
    
    console.log('计算运动时长统计，记录数:', exerciseRecords.length);
    
    exerciseRecords.forEach(record => {
        console.log('运动记录:', record.date, 'exerciseItems:', record.exerciseItems);
        if (record.exerciseItems) {
            try {
                const items = JSON.parse(record.exerciseItems);
                console.log('解析后的运动项目:', items);
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        console.log('运动项目:', item.name, '时长:', item.duration);
                        if (item.duration) {
                            const mins = parseInt(item.duration);
                            if (mins === 121) {
                                // 2小时以上按120分钟计算
                                totalMinutes += 120;
                            } else {
                                totalMinutes += mins;
                            }
                            hasDurationData = true;
                        }
                    });
                }
            } catch (e) {
                console.error('解析运动数据失败:', e);
            }
        }
    });
    
    console.log('运动总时长(分钟):', totalMinutes, '有数据:', hasDurationData);
    
    const timeStatElement = document.getElementById('exerciseTimeStat');
    const totalTimeElement = document.getElementById('exerciseTotalTime');
    const avgTimeElement = document.getElementById('exerciseAvgTime');
    
    if (hasDurationData && exerciseRecords.length > 0) {
        timeStatElement.style.display = 'flex';
        totalTimeElement.textContent = formatTotalTime(totalMinutes);
        console.log('显示运动时长统计:', formatTotalTime(totalMinutes));
    } else {
        timeStatElement.style.display = 'none';
        console.log('隐藏运动时长统计');
    }
}

// 计算家务时长统计
function calculateChoreTimeStats(choreRecords) {
    let totalMinutes = 0;
    let hasDurationData = false;
    
    console.log('计算家务时长统计，记录数:', choreRecords.length);
    
    choreRecords.forEach(record => {
        console.log('家务记录:', record.date, 'chore:', record.chore, 'choreItems:', record.choreItems);
        if (record.choreItems) {
            try {
                const items = JSON.parse(record.choreItems);
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        // 根据家务类型估算时长
                        const score = item.score || 0;
                        if (score === 10) {
                            totalMinutes += 30; // 轻度家务约30分钟
                            hasDurationData = true;
                        } else if (score === 20) {
                            totalMinutes += 60; // 中度家务约1小时
                            hasDurationData = true;
                        } else if (score === 30) {
                            totalMinutes += 120; // 重度家务约2小时
                            hasDurationData = true;
                        }
                    });
                }
            } catch (e) {
                console.error('解析家务数据失败:', e);
            }
        } else {
            // 旧数据格式，根据分数估算
            const choreScore = parseInt(record.chore) || 0;
            if (choreScore === 10) {
                totalMinutes += 30;
                hasDurationData = true;
            } else if (choreScore === 20) {
                totalMinutes += 60;
                hasDurationData = true;
            } else if (choreScore === 30) {
                totalMinutes += 120;
                hasDurationData = true;
            }
        }
    });
    
    const timeStatElement = document.getElementById('choreTimeStat');
    const totalTimeElement = document.getElementById('choreTotalTime');
    
    if (hasDurationData && choreRecords.length > 0) {
        timeStatElement.style.display = 'flex';
        totalTimeElement.textContent = formatTotalTime(totalMinutes);
    } else {
        timeStatElement.style.display = 'none';
    }
}

// 格式化总时长（以小时为单位显示，用h表示）
function formatTotalTime(minutes) {
    const hours = minutes / 60;
    if (Number.isInteger(hours)) {
        return hours + 'h';
    } else {
        return hours.toFixed(1) + 'h';
    }
}

// 显示变化值
function showChange(elementId, change) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let icon = '';
    let className = '';
    
    if (change > 0) {
        icon = '↑';
        className = 'up';
    } else if (change < 0) {
        icon = '↓';
        className = 'down';
    } else {
        icon = '→';
        className = 'same';
    }
    
    element.textContent = `${icon} ${Math.abs(change)}`;
    element.className = `stat-change visible ${className}`;
}

// 隐藏所有变化
function hideAllChanges() {
    const changeIds = ['changeMeal', 'changeSnack', 'changeExercise', 'changeMood', 'changeSleep', 'changeChore'];
    changeIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '';
            element.className = 'stat-change';
        }
    });
}

// 根据选择的对比类型计算对比期间日期
function getCompareDates(startDate, endDate, compareType) {
    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);
    
    let prevStart, prevEnd;
    
    switch (compareType) {
        case 'previous':
            // 上一期：与当前选择的日期范围相同天数
            const daysDiff = Math.floor((currentEnd - currentStart) / (1000 * 60 * 60 * 24)) + 1;
            prevStart = new Date(currentStart);
            prevStart.setDate(prevStart.getDate() - daysDiff);
            prevEnd = new Date(currentStart);
            prevEnd.setDate(prevEnd.getDate() - 1);
            break;
            
        case 'lastWeek':
            // 上周：自然周，周一到周日（相对于当前日期）
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=周日, 1=周一, ..., 6=周六
            // 计算上周一（如果今天是周一，则上周一是7天前）
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const lastMonday = new Date(today);
            lastMonday.setDate(lastMonday.getDate() - daysToMonday - 7);
            // 计算上周日
            const lastSunday = new Date(lastMonday);
            lastSunday.setDate(lastSunday.getDate() + 6);
            prevStart = lastMonday;
            prevEnd = lastSunday;
            break;
            
        case 'lastMonth':
            // 上月：上个月的相同日期范围
            prevStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, currentStart.getDate());
            prevEnd = new Date(currentEnd.getFullYear(), currentEnd.getMonth() - 1, currentEnd.getDate());
            break;
            
        case 'lastYear':
            // 去年同期：去年的相同日期范围
            prevStart = new Date(currentStart.getFullYear() - 1, currentStart.getMonth(), currentStart.getDate());
            prevEnd = new Date(currentEnd.getFullYear() - 1, currentEnd.getMonth(), currentEnd.getDate());
            break;
            
        default:
            // 默认使用上一期
            const defaultDaysDiff = Math.floor((currentEnd - currentStart) / (1000 * 60 * 60 * 24)) + 1;
            prevStart = new Date(currentStart);
            prevStart.setDate(prevStart.getDate() - defaultDaysDiff);
            prevEnd = new Date(currentStart);
            prevEnd.setDate(prevEnd.getDate() - 1);
    }
    
    return {
        start: prevStart.toISOString().split('T')[0],
        end: prevEnd.toISOString().split('T')[0]
    };
}

// 添加对比期间切换事件
document.getElementById('comparePeriod').addEventListener('change', function() {
    // 如果当前在报表页面，重新生成报表
    if (document.getElementById('report').classList.contains('active')) {
        generateReport();
    }
});

// 更新图表
let chartInstance = null;

function updateChart(records) {
    const ctx = document.getElementById('energyChart').getContext('2d');
    
    // 销毁旧图表
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // 按日期排序
    const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
    
    const labels = sortedRecords.map(r => formatDate(r.date));
    const data = sortedRecords.map(r => r.energy);
    
    // 获取参考能量值
    const benchmark = parseInt(localStorage.getItem('energyBenchmark') || '80');
    
    // 找峰值和谷值索引
    let peakIndex = 0, valleyIndex = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i] > data[peakIndex]) peakIndex = i;
        if (data[i] < data[valleyIndex]) valleyIndex = i;
    }
    
    // 创建点样式数组，标记峰值和谷值
    const pointBackgroundColor = data.map((_, i) => {
        if (i === peakIndex) return '#10B981'; // 绿色标记峰值
        if (i === valleyIndex) return '#EF4444'; // 红色标记谷值
        return '#667eea';
    });
    
    const pointRadius = data.map((_, i) => {
        if (i === peakIndex || i === valleyIndex) return 8;
        return 5;
    });
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '能量值',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: pointBackgroundColor,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: pointRadius,
                    pointHoverRadius: 10
                },
                {
                    label: `参考值(${benchmark})`,
                    data: Array(data.length).fill(benchmark),
                    borderColor: '#F59E0B',
                    borderDash: [5, 5],
                    backgroundColor: 'transparent',
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                                // 添加峰值/谷值标记
                                if (context.dataIndex === peakIndex) {
                                    label += ' 📈 峰值';
                                } else if (context.dataIndex === valleyIndex) {
                                    label += ' 📉 谷值';
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 格式化日期
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 生成能量解读
function generateAnalysis(avgEnergy, benchmark, records, avgs) {
    // 能量状态总结
    let summary = `平均能量值 ${avgEnergy}，`;
    const diff = avgEnergy - benchmark;
    
    if (Math.abs(diff) <= 5) {
        summary += `接近参考值 ${benchmark}，状态稳定。`;
    } else if (diff > 0) {
        summary += `高于参考值 ${benchmark} ${diff} 分，整体状态良好！`;
    } else {
        summary += `低于参考值 ${benchmark} ${Math.abs(diff)} 分，建议关注并调整。`;
    }
    
    // 波动分析
    const energies = records.map(r => r.energy);
    const max = Math.max(...energies);
    const min = Math.min(...energies);
    const range = max - min;
    
    if (range <= 15) {
        summary += ' 本周整体状态平稳，无大幅波动。';
    } else if (range <= 30) {
        summary += ` 本周能量波动适中（${range}分），属正常范围。`;
    } else {
        // 分析波动原因（不重复日期，日期在趋势分析中显示）
        const peakIndex = energies.indexOf(max);
        const valleyIndex = energies.indexOf(min);
        const peakRecord = records[peakIndex];
        const valleyRecord = records[valleyIndex];
        
        const peakReasons = [];
        const valleyReasons = [];
        
        // 分析峰值原因
        if (parseInt(peakRecord.exercise) >= 3) peakReasons.push('高强度运动');
        if (parseInt(peakRecord.sleepQuality) >= 4) peakReasons.push('睡眠质量高');
        if (parseInt(peakRecord.mood) >= 4) peakReasons.push('心情好');
        if (parseInt(peakRecord.meal) >= 6) peakReasons.push('三餐均衡');
        
        // 分析谷值原因
        if (parseInt(valleyRecord.exercise) <= 1) valleyReasons.push('运动量少');
        if (parseInt(valleyRecord.sleepQuality) <= 2) valleyReasons.push('睡眠质量差');
        if (parseInt(valleyRecord.mood) <= 2) valleyReasons.push('心情低落');
        if (parseInt(valleyRecord.health) <= 2) valleyReasons.push('身体不适');
        
        let reasonText = '';
        if (peakReasons.length > 0 && valleyReasons.length > 0) {
            reasonText = `主要因${peakReasons.join('、')}使能量升高，${valleyReasons.join('、')}使能量降低。`;
        } else if (peakReasons.length > 0) {
            reasonText = `主要因${peakReasons.join('、')}使能量升高。`;
        } else if (valleyReasons.length > 0) {
            reasonText = `主要因${valleyReasons.join('、')}使能量降低。`;
        } else {
            reasonText = '建议关注作息规律和运动习惯。';
        }
        
        summary += ` 本周能量波动较大（${range}分），${reasonText}`;
    }
    
    // 趋势分析
    let trendAnalysis = '';
    if (records.length >= 2) {
        const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
        const sortedEnergies = sortedRecords.map(r => r.energy);
        const firstEnergy = sortedRecords[0].energy;
        const lastEnergy = sortedRecords[sortedRecords.length - 1];
        const trend = lastEnergy - firstEnergy;
        
        // 找峰值和谷值（基于排序后的数组）
        let peakIndex = 0, valleyIndex = 0;
        for (let i = 1; i < sortedEnergies.length; i++) {
            if (sortedEnergies[i] > sortedEnergies[peakIndex]) peakIndex = i;
            if (sortedEnergies[i] < sortedEnergies[valleyIndex]) valleyIndex = i;
        }
        
        // 获取周几信息
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        const peakDate = new Date(sortedRecords[peakIndex].date);
        const peakWeekday = weekdays[peakDate.getDay()];
        const valleyDate = new Date(sortedRecords[valleyIndex].date);
        const valleyWeekday = weekdays[valleyDate.getDay()];
        
        // 生成趋势描述
        if (trend > 10) {
            trendAnalysis = `本周能量值整体呈上升趋势（+${trend}分）。`;
        } else if (trend < -10) {
            trendAnalysis = `本周能量值整体呈下降趋势（${trend}分）。`;
        } else {
            trendAnalysis = '本周能量值整体保持稳定。';
        }
        
        // 添加峰值谷值信息
        trendAnalysis += ` ${formatDate(sortedRecords[peakIndex].date)}（${peakWeekday}）达到峰值 ${sortedEnergies[peakIndex]}分`;
        if (peakIndex !== valleyIndex) {
            trendAnalysis += `，${formatDate(sortedRecords[valleyIndex].date)}（${valleyWeekday}）为谷值 ${sortedEnergies[valleyIndex]}分。`;
        } else {
            trendAnalysis += '。';
        }
    } else {
        trendAnalysis = '';
    }
    
    // 设置输出
    document.getElementById('energySummary').textContent = summary;
    document.getElementById('trendAnalysis').textContent = trendAnalysis;
}

// 生成对比分析
function generateComparison(records, currentAvg) {
    // 本周 vs 上周对比
    const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));
    const today = new Date();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const thisWeekRecords = sortedRecords.filter(r => {
        const date = new Date(r.date);
        return date >= thisWeekStart;
    });
    
    const lastWeekRecords = sortedRecords.filter(r => {
        const date = new Date(r.date);
        return date >= lastWeekStart && date < thisWeekStart;
    });
    
    const thisWeekAvg = thisWeekRecords.length > 0 
        ? Math.round(thisWeekRecords.reduce((sum, r) => sum + r.energy, 0) / thisWeekRecords.length) 
        : 0;
    
    const lastWeekAvg = lastWeekRecords.length > 0 
        ? Math.round(lastWeekRecords.reduce((sum, r) => sum + r.energy, 0) / lastWeekRecords.length) 
        : 0;
    
    const weekChange = thisWeekAvg - lastWeekAvg;
    
    document.getElementById('thisWeekAvg').textContent = thisWeekAvg;
    document.getElementById('lastWeekAvg').textContent = lastWeekAvg;
    
    const weekChangeEl = document.getElementById('weekChange');
    weekChangeEl.textContent = weekChange >= 0 ? `+${weekChange}` : weekChange;
    weekChangeEl.className = `comparison-value change ${weekChange < 0 ? 'negative' : ''}`;
    
    // 运动日 vs 非运动日对比
    const exerciseDayRecords = records.filter(r => {
        const exercise = parseInt(r.exercise) || 0;
        return exercise > 0;
    });
    
    const noExerciseDayRecords = records.filter(r => {
        const exercise = parseInt(r.exercise) || 0;
        return exercise <= 0;
    });
    
    const exerciseDayAvg = exerciseDayRecords.length > 0 
        ? Math.round(exerciseDayRecords.reduce((sum, r) => sum + r.energy, 0) / exerciseDayRecords.length) 
        : 0;
    
    const noExerciseDayAvg = noExerciseDayRecords.length > 0 
        ? Math.round(noExerciseDayRecords.reduce((sum, r) => sum + r.energy, 0) / noExerciseDayRecords.length) 
        : 0;
    
    const exerciseDiff = exerciseDayAvg - noExerciseDayAvg;
    
    document.getElementById('exerciseDayAvg').textContent = exerciseDayAvg;
    document.getElementById('noExerciseDayAvg').textContent = noExerciseDayAvg;
    
    const exerciseDiffEl = document.getElementById('exerciseDiff');
    exerciseDiffEl.textContent = exerciseDiff >= 0 ? `+${exerciseDiff}` : exerciseDiff;
    exerciseDiffEl.className = `comparison-value change ${exerciseDiff < 0 ? 'negative' : ''}`;
    
    // 工作日 vs 休息日对比
    // 周一到周五为工作日（0-4），周六日为休息日（5-6）
    const weekdayRecords = records.filter(r => {
        const date = new Date(r.date);
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // 周一到周五
    });
    
    const weekendRecords = records.filter(r => {
        const date = new Date(r.date);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // 周日或周六
    });
    
    const weekdayAvg = weekdayRecords.length > 0 
        ? Math.round(weekdayRecords.reduce((sum, r) => sum + r.energy, 0) / weekdayRecords.length) 
        : 0;
    
    const weekendAvg = weekendRecords.length > 0 
        ? Math.round(weekendRecords.reduce((sum, r) => sum + r.energy, 0) / weekendRecords.length) 
        : 0;
    
    const weekdayDiff = weekdayAvg - weekendAvg;
    
    document.getElementById('weekdayAvg').textContent = weekdayAvg;
    document.getElementById('weekendAvg').textContent = weekendAvg;
    
    const weekdayDiffEl = document.getElementById('weekdayDiff');
    weekdayDiffEl.textContent = weekdayDiff >= 0 ? `+${weekdayDiff}` : weekdayDiff;
    weekdayDiffEl.className = `comparison-value change ${weekdayDiff < 0 ? 'negative' : ''}`;
}

// 对比分析标签切换
document.querySelectorAll('.comparison-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const targetTab = this.dataset.tab;
        
        // 切换标签状态
        document.querySelectorAll('.comparison-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // 切换内容面板
        document.querySelectorAll('.comparison-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${targetTab}Comparison`).classList.add('active');
    });
});

// 健康预警检查
function checkHealthWarning() {
    const records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    if (records.length < 3) return null;
    
    // 获取最近3天的记录（按日期排序）
    const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));
    const recent3Days = sortedRecords.slice(0, 3);
    
    // 检查条件：连续3天睡眠不足、情绪低落且能量值下降
    const warningConditions = {
        sleepPoor: false,    // 睡眠质量差（较差或非常差）
        moodLow: false,      // 情绪低落
        energyDrop: false    // 能量值持续下降
    };
    
    // 检查睡眠和心情
    let allPoorSleep = true;
    let allLowMood = true;
    
    recent3Days.forEach(record => {
        const sleepQuality = parseInt(record.sleepQuality) || 0;
        const mood = parseInt(record.mood) || 0;
        
        // 睡眠质量：3=较差，4=非常差
        if (sleepQuality < 3) allPoorSleep = false;
        // 心情：0=低落，1=一般
        if (mood > 1) allLowMood = false;
    });
    
    warningConditions.sleepPoor = allPoorSleep;
    warningConditions.moodLow = allLowMood;
    
    // 检查能量值是否持续下降
    if (recent3Days.length === 3) {
        const energy1 = recent3Days[0].energy || 0;
        const energy2 = recent3Days[1].energy || 0;
        const energy3 = recent3Days[2].energy || 0;
        
        if (energy1 < energy2 && energy2 < energy3) {
            warningConditions.energyDrop = true;
        }
    }
    
    // 如果满足所有条件，生成预警建议
    if (warningConditions.sleepPoor && warningConditions.moodLow && warningConditions.energyDrop) {
        const suggestions = [
            '建议今晚11点前入睡，保证充足睡眠',
            '补充一杯温水，保持身体水分',
            '进行10分钟冥想或深呼吸',
            '适量运动，如散步或拉伸',
            '吃一顿营养均衡的餐食',
            '减少咖啡因和糖分摄入'
        ];
        
        // 随机选择2-3条建议
        const shuffled = suggestions.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.floor(Math.random() * 2) + 2);
        
        return {
            type: 'status_drop',
            message: '⚠️ 状态下滑预警',
            description: '检测到连续3天睡眠不足、情绪低落且能量值持续下降',
            suggestions: selected
        };
    }
    
    return null;
}

// 显示健康预警
function showHealthWarning(warning) {
    if (!warning) return;
    
    const warningHTML = `
        <div class="warning-card">
            <div class="warning-header">
                <span class="warning-icon">⚠️</span>
                <span class="warning-title">${warning.message}</span>
            </div>
            <p class="warning-description">${warning.description}</p>
            <div class="warning-suggestions">
                <h4>💡 调整建议：</h4>
                <ul>
                    ${warning.suggestions.map(s => `<li>• ${s}</li>`).join('')}
                </ul>
            </div>
            <button class="warning-close" onclick="this.parentElement.remove()">✕</button>
        </div>
    `;
    
    const container = document.querySelector('.content-container');
    container.insertAdjacentHTML('afterbegin', warningHTML);
}

// 加载历史记录
function loadHistory() {
    const records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    
    const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));
    
    const historyList = document.getElementById('historyList');
    if (!historyList) {
        return;
    }
    
    if (sortedRecords.length === 0) {
        historyList.innerHTML = '<p class="empty-message">暂无记录，请先添加数据</p>';
        return;
    }
    
    historyList.innerHTML = sortedRecords.map(record => `
        <div class="history-item" data-record-id="${record.id}">
            <button class="edit-btn" data-record-id="${record.id}" onclick="window.editRecord('${record.id}')">编辑</button>
            <button class="delete-btn" data-record-id="${record.id}">删除</button>
            <div class="date">📅 ${record.date}</div>
            <div class="energy">⚡ 能量值: ${record.energy}</div>
            <div class="details">
                <div>🍽️ 三餐: ${record.breakdown?.meal || 0}</div>
                <div>🏃 运动: ${record.breakdown?.exercise || 0}</div>
                <div>😊 心情: ${record.breakdown?.mood || 0}</div>
                <div>😴 睡眠: ${record.breakdown?.sleep || 0}</div>
                <div>🧹 家务: ${record.breakdown?.chore || 0}</div>
                <div>❤️ 身体: ${record.breakdown?.health || 0}</div>
            </div>
            ${record.notes ? `<div class="notes">📝 ${record.notes}</div>` : ''}
        </div>
    `).join('');
    
    // 重新绑定事件（每次加载历史记录后都重新绑定）
    bindHistoryEvents();
}

// 绑定历史记录事件（保持兼容性）
function bindHistoryEvents() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    // 移除所有之前的事件监听器（通过重新绑定）
    historyList.removeEventListener('click', handleHistoryClick);
    historyList.addEventListener('click', handleHistoryClick);
}

function handleHistoryClick(e) {
    // 处理删除按钮
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        e.stopPropagation();
        e.preventDefault();
        
        const recordId = deleteBtn.getAttribute('data-record-id');
        if (!recordId) return;
        
        // 直接删除，不再显示确认对话框
        window.deleteRecord(recordId);
        return;
    }
    
    // 处理编辑按钮（保持原来的逻辑）
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
        e.stopPropagation();
        const recordId = editBtn.getAttribute('data-record-id');
        if (recordId) {
            window.editRecord(recordId);
        }
        return;
    }
}

// 报表生成按钮事件
document.getElementById('generateReport').addEventListener('click', generateReport);

// 保存参考能量值
document.getElementById('saveBenchmark').addEventListener('click', function() {
    const benchmark = document.getElementById('benchmarkValue').value;
    if (benchmark && !isNaN(benchmark)) {
        localStorage.setItem('energyBenchmark', benchmark);
        document.getElementById('benchmarkDisplay').textContent = benchmark;
        // 隐藏编辑框
        hideBenchmarkEdit();
        // 如果当前在报表页面，刷新报表
        if (document.getElementById('report').classList.contains('active')) {
            generateReport();
        }
    }
});

// 取消编辑参考能量值
document.getElementById('cancelBenchmark').addEventListener('click', function() {
    hideBenchmarkEdit();
});

// 点击参考能量值卡片显示编辑框
document.getElementById('benchmarkCard').addEventListener('click', function(e) {
    // 如果点击的是编辑框内部，不处理
    if (e.target.closest('.benchmark-edit')) {
        return;
    }
    showBenchmarkEdit();
});

// 显示编辑框
function showBenchmarkEdit() {
    document.getElementById('benchmarkCard').classList.add('editing');
    document.getElementById('benchmarkEdit').classList.add('active');
}

// 隐藏编辑框
function hideBenchmarkEdit() {
    document.getElementById('benchmarkCard').classList.remove('editing');
    document.getElementById('benchmarkEdit').classList.remove('active');
    // 恢复原始值
    const savedBenchmark = localStorage.getItem('energyBenchmark');
    document.getElementById('benchmarkValue').value = savedBenchmark || '80';
}

// 初始化参考能量值显示
const savedBenchmark = localStorage.getItem('energyBenchmark');
if (savedBenchmark) {
    document.getElementById('benchmarkValue').value = savedBenchmark;
    document.getElementById('benchmarkDisplay').textContent = savedBenchmark;
}

// 日历相关变量
let currentCalendarDate = new Date();

// 当前筛选条件
let currentFilter = 'all';

// 图例筛选点击事件
document.querySelectorAll('.legend-item').forEach(item => {
    item.addEventListener('click', function() {
        // 更新选中状态
        document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        // 获取筛选条件
        currentFilter = this.dataset.filter;
        
        // 应用筛选
        applyFilter();
    });
});

// 应用筛选
function applyFilter() {
    const days = document.querySelectorAll('.calendar-day');
    
    days.forEach(day => {
        // 移除之前的hidden类
        day.classList.remove('hidden');
        
        if (currentFilter === 'all') {
            // 显示所有
            return;
        }
        
        // 判断是否匹配筛选条件
        let matches = false;
        
        if (currentFilter === 'exercise') {
            // 显示所有有运动的日期（包括仅运动和两者都有）
            matches = day.classList.contains('exercise-only') || day.classList.contains('both-checkin');
        } else if (currentFilter === 'chore') {
            // 显示所有有家务的日期（包括仅家务和两者都有）
            matches = day.classList.contains('chore-only') || day.classList.contains('both-checkin');
        } else if (currentFilter === 'nosnack') {
            // 显示不吃零食的日期
            matches = day.classList.contains('nosnack-only');
        }
        
        if (!matches) {
            day.classList.add('hidden');
        }
    });
}

// 生成日历
function generateCalendar(records) {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // 更新月份显示
    document.getElementById('calendarMonth').textContent = `${year}年${month + 1}月`;
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 创建记录映射
    const recordMap = new Map();
    records.forEach(r => {
        recordMap.set(r.date, r);
    });
    
    // 计算需要显示的日期范围
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - firstDay.getDay());
    
    // 生成日历格子
    let html = '';
    const currentDay = new Date(startDay);
    
    while (currentDay <= lastDay || currentDay.getMonth() === month) {
        // 使用本地日期格式，避免时区偏移问题
        const year = currentDay.getFullYear();
        const monthStr = String(currentDay.getMonth() + 1).padStart(2, '0');
        const dayStr = String(currentDay.getDate()).padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;
        const isCurrentMonth = currentDay.getMonth() === month;
        const isToday = currentDay.getTime() === today.getTime();
        const record = recordMap.get(dateStr);
        
        // 判断打卡状态
        const hasExercise = record ? parseInt(record.exercise) > 0 : false;
        const hasChore = record ? parseInt(record.chore) > 0 : false;
        const hasNoSnack = record ? (!record.snack || parseInt(record.snack) === 0) : false;
        
        let className = 'calendar-day';
        if (!isCurrentMonth) {
            className += ' other-month';
        } else if (!record) {
            className += ' no-checkin';
        } else if (hasExercise && hasChore) {
            className += ' both-checkin';
        } else if (hasExercise) {
            className += ' exercise-only';
        } else if (hasChore) {
            className += ' chore-only';
        } else if (hasNoSnack) {
            className += ' nosnack-only';
        }
        
        if (isToday && isCurrentMonth) {
            className += ' today';
        }
        
        // 生成图标
        let icons = '';
        if (hasExercise) icons += '🏃';
        if (hasChore) icons += '🧹';
        if (hasNoSnack && !hasExercise && !hasChore) icons += '🍪';
        
        // 生成弹窗内容
        let popupContent = '';
        if (record) {
            popupContent = `
                <div class="popup-date">📅 ${dateStr}</div>
                ${hasExercise ? `<div class="popup-item exercise">🏃 ${record.exerciseItems ? getExerciseItemsLabel(record.exerciseItems) : getExerciseLabel(parseInt(record.exercise))}</div>` : ''}
                ${hasChore ? `<div class="popup-item chore">🧹 ${record.choreItems ? JSON.parse(record.choreItems).join(', ') : getChoreLabel(parseInt(record.chore))}</div>` : ''}
                ${hasNoSnack ? `<div class="popup-item nosnack">🍪 今日未吃零食</div>` : ''}
            `;
        }
        
        html += `
            <div class="${className}">
                <span class="day-number">${currentDay.getDate()}</span>
                <span class="day-icons">${icons}</span>
                ${popupContent ? `<div class="calendar-popup">${popupContent}</div>` : ''}
            </div>
        `;
        
        // 移动到下一天
        currentDay.setDate(currentDay.getDate() + 1);
        
        // 检查是否超出范围
        if (!isCurrentMonth && currentDay.getMonth() !== month && currentDay > lastDay) {
            break;
        }
    }
    
    document.getElementById('calendarDays').innerHTML = html;
    
    // 应用筛选条件
    applyFilter();
}

// 获取运动标签
function getExerciseLabel(value) {
    const labels = {
        10: '轻度运动',
        20: '中度运动',
        30: '重度运动',
        45: '高强度运动'
    };
    return labels[value] || '运动';
}

// 获取家务标签
function getChoreLabel(value) {
    const labels = {
        10: '轻度家务',
        20: '中度家务',
        30: '重度家务'
    };
    return labels[value] || '家务';
}

// 格式化零食项目
function formatSnackItems(snackItemsStr) {
    try {
        const data = JSON.parse(snackItemsStr);
        if (Array.isArray(data) && data.length > 0) {
            return data.join(', ');
        }
    } catch (e) {
        console.error('解析零食项目失败:', e);
    }
    return '';
}

function getExerciseItemsLabel(exerciseItemsStr) {
    try {
        const data = JSON.parse(exerciseItemsStr);
        
        // 新格式：数组包含每个运动的详细信息
        if (Array.isArray(data) && data.length > 0) {
            const displayItems = data.map(item => {
                const durationText = item.duration ? `(${formatDuration(item.duration)})` : '';
                return `${item.name}${durationText}`;
            });
            return displayItems.join(' + ');
        }
        
        // 旧格式兼容
        const items = data.items || [];
        const duration = data.duration || '';
        
        if (items.length === 0) {
            return '运动';
        }
        
        const durationText = duration ? ` (${formatDuration(duration)})` : '';
        
        return `${items.join(' + ')}${durationText}`;
    } catch (e) {
        return '运动';
    }
}

// 格式化时长显示
function formatDuration(minutes) {
    if (!minutes || parseInt(minutes) === 0) return '';
    const mins = parseInt(minutes);
    if (mins === 121) {
        return '2小时以上';
    } else if (mins < 60) {
        return `${mins}分钟`;
    } else if (mins === 60) {
        return '1小时';
    } else {
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        if (remainingMins === 0) {
            return `${hours}小时`;
        } else {
            return `${hours}小时${remainingMins}分钟`;
        }
    }
}

// 日历导航
document.getElementById('prevMonth').addEventListener('click', function() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    const records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    generateCalendar(records);
});

document.getElementById('nextMonth').addEventListener('click', function() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    const records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    generateCalendar(records);
});

// 计算零食总分
function calculateSnackScore() {
    const checkboxes = document.querySelectorAll('.snack-checkbox:checked');
    let totalScore = 0;
    const selectedItems = [];
    
    checkboxes.forEach(checkbox => {
        totalScore += parseInt(checkbox.dataset.score);
        selectedItems.push(checkbox.dataset.name);
    });
    
    // 如果没有选中任何零食，但snack字段已有值（编辑旧记录时），保留原有分数
    if (selectedItems.length === 0) {
        const existingSnack = document.getElementById('snack').value;
        if (existingSnack && parseInt(existingSnack) !== 0) {
            totalScore = parseInt(existingSnack);
        }
    }
    
    // 更新隐藏字段
    document.getElementById('snack').value = totalScore;
    document.getElementById('snackItems').value = JSON.stringify(selectedItems);
    
    // 更新下拉框显示
    const trigger = document.getElementById('snackDropdown');
    const selectedText = document.getElementById('snackSelected');
    const selectedCount = document.getElementById('dropdownSelectedCount');
    const dropdownScore = document.getElementById('dropdownScore');
    
    if (selectedItems.length === 0) {
        if (totalScore !== 0) {
            // 有分数但没有选中项目（旧记录），显示分数
            selectedText.textContent = `零食得分 (+${totalScore > 0 ? '+' : ''}${totalScore}分)`;
            trigger.classList.add('has-selection');
        } else {
            selectedText.textContent = '请选择零食';
            trigger.classList.remove('has-selection');
        }
    } else if (selectedItems.length === 1) {
        selectedText.textContent = `${selectedItems[0]} (+${totalScore > 0 ? '+' : ''}${totalScore}分)`;
        trigger.classList.add('has-selection');
    } else {
        selectedText.textContent = `已选${selectedItems.length}项 (+${totalScore > 0 ? '+' : ''}${totalScore}分)`;
        trigger.classList.add('has-selection');
    }
    
    // 更新下拉框内部的统计
    selectedCount.textContent = selectedItems.length;
    dropdownScore.textContent = `${totalScore > 0 ? '+' : ''}${totalScore}`;
}

// 绑定零食选择事件
document.querySelectorAll('.snack-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', calculateSnackScore);
});

// 更新下拉框位置
function updateDropdownPosition() {
    const dropdown = document.getElementById('snackDropdownContent');
    const trigger = document.getElementById('snackDropdown');
    
    if (dropdown.classList.contains('open') && trigger) {
        const rect = trigger.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = (rect.bottom + 8) + 'px';
        dropdown.style.width = rect.width + 'px';
    }
}

// 下拉框切换
document.getElementById('snackDropdown').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('snackDropdownContent');
    const trigger = document.getElementById('snackDropdown');
    
    dropdown.classList.toggle('open');
    trigger.classList.toggle('open');
    
    if (dropdown.classList.contains('open')) {
        updateDropdownPosition();
    } else {
        dropdown.style.left = 'auto';
        dropdown.style.top = 'auto';
        dropdown.style.width = 'auto';
    }
});

// 页面滚动时更新下拉框位置
window.addEventListener('scroll', updateDropdownPosition);

// 窗口大小改变时更新下拉框位置
window.addEventListener('resize', updateDropdownPosition);

// 点击外部关闭下拉框
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('snackDropdownContent');
    const trigger = document.getElementById('snackDropdown');
    
    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
    }
});

// 清除选择
document.getElementById('clearSnackSelection').addEventListener('click', function() {
    document.querySelectorAll('.snack-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        // 同时隐藏并清空"其他"输入框
        if (checkbox.dataset.other === 'true') {
            const parentLabel = checkbox.closest('.dropdown-option');
            const otherInput = parentLabel.querySelector('.other-input');
            if (otherInput) {
                otherInput.style.display = 'none';
                otherInput.value = '';
            }
        }
    });
    // 先清空隐藏字段值，再计算分数
    const snack = document.getElementById('snack');
    const snackItems = document.getElementById('snackItems');
    if (snack) snack.value = '';
    if (snackItems) snackItems.value = '';
    calculateSnackScore();
});

// 计算家务总分
function calculateChoreScore() {
    const checkboxes = document.querySelectorAll('.chore-checkbox:checked');
    let totalScore = 0;
    const selectedItems = [];
    
    checkboxes.forEach(checkbox => {
        totalScore += parseInt(checkbox.dataset.score);
        const parentLabel = checkbox.closest('.dropdown-option');
        const durationSelect = parentLabel.querySelector('.chore-duration-select');
        const duration = durationSelect ? durationSelect.value : '';
        const isOther = checkbox.dataset.other === 'true';
        
        if (isOther) {
            // 如果是"其他"选项，获取用户输入的内容
            const otherInput = parentLabel.querySelector('.other-input');
            const customText = otherInput.value.trim() || checkbox.dataset.name;
            selectedItems.push({ name: customText, score: parseInt(checkbox.dataset.score), duration: duration });
        } else {
            selectedItems.push({ name: checkbox.dataset.name, score: parseInt(checkbox.dataset.score), duration: duration });
        }
    });
    
    // 如果没有选中任何家务，但chore字段已有值（编辑旧记录时），保留原有分数
    if (selectedItems.length === 0) {
        const existingChore = document.getElementById('chore').value;
        if (existingChore && parseInt(existingChore) !== 0) {
            totalScore = parseInt(existingChore);
        }
    }
    
    // 更新隐藏字段
    document.getElementById('chore').value = totalScore;
    document.getElementById('choreItems').value = JSON.stringify(selectedItems);
    
    // 更新下拉框显示
    const trigger = document.getElementById('choreDropdown');
    const selectedText = document.getElementById('choreSelected');
    const selectedCount = document.getElementById('choreDropdownSelectedCount');
    const dropdownScore = document.getElementById('choreDropdownScore');
    
    if (selectedItems.length === 0) {
        if (totalScore !== 0) {
            // 有分数但没有选中项目（旧记录），显示分数
            selectedText.textContent = `家务得分 (+${totalScore > 0 ? '+' : ''}${totalScore}分)`;
            trigger.classList.add('has-selection');
        } else {
            selectedText.textContent = '请选择家务';
            trigger.classList.remove('has-selection');
        }
    } else if (selectedItems.length === 1) {
        selectedText.textContent = `${selectedItems[0].name} (+${totalScore > 0 ? '+' : ''}${totalScore}分)`;
        trigger.classList.add('has-selection');
    } else {
        selectedText.textContent = `已选${selectedItems.length}项 (+${totalScore > 0 ? '+' : ''}${totalScore}分)`;
        trigger.classList.add('has-selection');
    }
    
    // 更新下拉框内部的统计
    selectedCount.textContent = selectedItems.length;
    dropdownScore.textContent = `${totalScore > 0 ? '+' : ''}${totalScore}`;
}

// 家务"其他"选项的显示/隐藏输入框
document.querySelectorAll('.chore-checkbox[data-other="true"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const parentLabel = this.closest('.dropdown-option');
        const otherInput = parentLabel.querySelector('.other-input');
        if (this.checked) {
            otherInput.style.display = 'inline-block';
            otherInput.focus();
        } else {
            otherInput.style.display = 'none';
            otherInput.value = '';
        }
        calculateChoreScore();
    });
    
    // 绑定其他输入框的输入事件
    const parentLabel = checkbox.closest('.dropdown-option');
    const otherInput = parentLabel.querySelector('.other-input');
    otherInput.addEventListener('input', calculateChoreScore);
});

// 绑定家务选择事件
document.querySelectorAll('.chore-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const parentLabel = this.closest('.dropdown-option');
        const durationSelect = parentLabel.querySelector('.chore-duration-select');
        
        if (this.checked) {
            durationSelect.style.display = 'inline-block';
        } else {
            durationSelect.style.display = 'none';
            durationSelect.value = '';
        }
        
        calculateChoreScore();
    });
});

// 绑定家务时长选择事件
document.querySelectorAll('.chore-duration-select').forEach(select => {
    select.addEventListener('change', calculateChoreScore);
});

// 更新家务下拉框位置
function updateChoreDropdownPosition() {
    const dropdown = document.getElementById('choreDropdownContent');
    const trigger = document.getElementById('choreDropdown');
    
    if (dropdown.classList.contains('open') && trigger) {
        const rect = trigger.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = (rect.bottom + 8) + 'px';
        dropdown.style.width = rect.width + 'px';
    }
}

// 家务下拉框切换
document.getElementById('choreDropdown').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('choreDropdownContent');
    const trigger = document.getElementById('choreDropdown');
    
    dropdown.classList.toggle('open');
    trigger.classList.toggle('open');
    
    if (dropdown.classList.contains('open')) {
        updateChoreDropdownPosition();
    } else {
        dropdown.style.left = 'auto';
        dropdown.style.top = 'auto';
        dropdown.style.width = 'auto';
    }
});

// 页面滚动时更新家务下拉框位置
window.addEventListener('scroll', updateChoreDropdownPosition);

// 窗口大小改变时更新家务下拉框位置
window.addEventListener('resize', updateChoreDropdownPosition);

// 点击外部关闭家务下拉框
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('choreDropdownContent');
    const trigger = document.getElementById('choreDropdown');
    
    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
    }
});

// 清除家务选择
document.getElementById('clearChoreSelection').addEventListener('click', function() {
    document.querySelectorAll('.chore-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const parentLabel = checkbox.closest('.dropdown-option');
        
        // 隐藏并清空时长选择框
        const durationSelect = parentLabel.querySelector('.chore-duration-select');
        if (durationSelect) {
            durationSelect.style.display = 'none';
            durationSelect.value = '';
        }
        
        // 同时隐藏并清空"其他"输入框
        if (checkbox.dataset.other === 'true') {
            const otherInput = parentLabel.querySelector('.other-input');
            if (otherInput) {
                otherInput.style.display = 'none';
                otherInput.value = '';
            }
        }
    });
    // 先清空隐藏字段值，再计算分数
    const chore = document.getElementById('chore');
    const choreItems = document.getElementById('choreItems');
    if (chore) chore.value = '';
    if (choreItems) choreItems.value = '';
    calculateChoreScore();
});

// 计算睡眠时长
function calculateSleepDuration() {
    const sleepTime = document.getElementById('sleepTime').value;
    const wakeTime = document.getElementById('wakeTime').value;
    
    if (!sleepTime || !wakeTime) {
        document.getElementById('sleepDuration').textContent = '0.0 小时';
        document.getElementById('sleepHours').value = '0';
        return;
    }
    
    // 解析时间
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    
    // 计算睡眠时长（考虑跨天情况）
    let sleepMinutes = (wakeHour * 60 + wakeMin) - (sleepHour * 60 + sleepMin);
    if (sleepMinutes < 0) {
        sleepMinutes += 24 * 60; // 跨天情况
    }
    
    const sleepHours = (sleepMinutes / 60).toFixed(1);
    const sleepDurationEl = document.getElementById('sleepDuration');
    if (sleepDurationEl) sleepDurationEl.textContent = sleepHours + ' 小时';
    const sleepHoursEl = document.getElementById('sleepHours');
    if (sleepHoursEl) sleepHoursEl.value = sleepHours;
}

// 绑定睡眠时间变化事件
document.getElementById('sleepTime').addEventListener('change', calculateSleepDuration);
document.getElementById('wakeTime').addEventListener('change', calculateSleepDuration);

// 页面加载时计算初始睡眠时长
document.addEventListener('DOMContentLoaded', function() {
    calculateSleepDuration();
});

// 获取筛选后的记录
function getFilteredRecords() {
    const records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    const startDate = document.getElementById('exportStartDate').value;
    const endDate = document.getElementById('exportEndDate').value;
    
    let filteredRecords = records;
    if (startDate && endDate) {
        filteredRecords = records.filter(r => r.date >= startDate && r.date <= endDate);
    } else if (startDate) {
        filteredRecords = records.filter(r => r.date >= startDate);
    } else if (endDate) {
        filteredRecords = records.filter(r => r.date <= endDate);
    }
    
    return filteredRecords;
}

// 生成文件名
function generateFileName(prefix) {
    const startDate = document.getElementById('exportStartDate').value;
    const endDate = document.getElementById('exportEndDate').value;
    
    let fileName = prefix;
    if (startDate && endDate) {
        fileName += `_${startDate}_to_${endDate}`;
    } else if (startDate) {
        fileName += `_from_${startDate}`;
    } else if (endDate) {
        fileName += `_to_${endDate}`;
    } else {
        fileName += `_${new Date().toISOString().split('T')[0]}`;
    }
    return fileName;
}

// 导出下拉菜单切换
document.getElementById('exportButton').addEventListener('click', function(e) {
    e.stopPropagation();
    const menu = document.getElementById('exportMenu');
    menu.classList.toggle('show');
});

// 点击其他地方关闭菜单
document.addEventListener('click', function() {
    document.getElementById('exportMenu').classList.remove('show');
});

// 导出CSV
document.getElementById('exportCSV').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('exportMenu').classList.remove('show');
    
    const filteredRecords = getFilteredRecords();
    
    if (filteredRecords.length === 0) {
        alert('该日期范围内没有数据');
        return;
    }
    
    // 生成CSV
    const headers = ['日期', '早餐', '午餐', '晚餐', '零食', '零食项目', '运动', '运动项目', '心情', '睡眠时长', '睡眠质量', '入睡时间', '起床时间', '家务', '家务项目', '身体状况', '身体状况详情', '能量值', '备注'];
    
    const rows = filteredRecords.map(r => [
        r.date,
        r.breakfast || '',
        r.lunch || '',
        r.dinner || '',
        r.snack || '',
        r.snackItems ? formatSnackItems(r.snackItems) : '',
        r.exercise || '',
        r.exerciseItems ? getExerciseItemsLabel(r.exerciseItems) : '',
        r.mood || '',
        r.sleepHours || '',
        r.sleepQuality || '',
        r.sleepTime || '',
        r.wakeTime || '',
        r.chore || '',
        r.choreItems ? JSON.parse(r.choreItems).join(', ') : '',
        r.health || '',
        r.healthDetail || '',
        r.energy || '',
        r.notes || ''
    ]);
    
    // 添加BOM以支持Excel正确识别UTF-8
    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generateFileName('energy_records')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('CSV数据导出成功！');
});

// 导出JSON
document.getElementById('exportJSON').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('exportMenu').classList.remove('show');
    
    const filteredRecords = getFilteredRecords();
    
    if (filteredRecords.length === 0) {
        alert('该日期范围内没有数据');
        return;
    }
    
    const dataStr = JSON.stringify(filteredRecords, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generateFileName('energy_records')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('JSON数据导出成功！');
});

// 导入数据按钮
document.getElementById('importData').addEventListener('click', function() {
    document.getElementById('importFile').click();
});

// 导入文件处理
document.getElementById('importFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importData = JSON.parse(event.target.result);
            
            if (!importData.records || !Array.isArray(importData.records)) {
                alert('无效的数据格式！');
                return;
            }
            
            if (confirm(`将导入 ${importData.records.length} 条记录，是否覆盖现有数据？`)) {
                localStorage.setItem('energyRecords', JSON.stringify(importData.records));
                if (importData.benchmark) {
                    localStorage.setItem('energyBenchmark', importData.benchmark);
                    document.getElementById('benchmarkValue').value = importData.benchmark;
                    document.getElementById('benchmarkDisplay').textContent = importData.benchmark;
                }
                alert('数据导入成功！');
                loadHistory();
                if (document.getElementById('report').classList.contains('active')) {
                    generateReport();
                }
            }
        } catch (error) {
            alert('导入失败：无效的JSON文件');
        }
    };
    reader.readAsText(file);
});





// 初始化工具更新日志（首次加载时添加）
function initSampleLogs() {
    const sampleLogs = [
        {
            date: '2026-05-09',
            version: 'v1.4.1',
            title: '设置页面整合与运动模块扩展',
            items: [
                { type: 'feature', text: '设置页面重构' },
                { type: 'sub', text: '- 整合主题配色、历史记录入口、更新日志、数据管理等功能' },
                { type: 'sub', text: '- 移除首页的历史记录和更新日志按钮' },
                { type: 'feature', text: '运动模块扩展' },
                { type: 'sub', text: '- 轻度运动：新增太极、八段锦' },
                { type: 'sub', text: '- 中度运动：新增游泳、羽毛球、乒乓球' },
                { type: 'sub', text: '- 重度运动：新增篮球、足球、网球、跳绳、爬山' },
                { type: 'feature', text: '运动模块支持自定义' },
                { type: 'sub', text: '- 每个运动分类新增「其他」选项' },
                { type: 'sub', text: '- 点击「其他」可输入自定义运动项目' },
                { type: 'feature', text: '家务模块支持自定义' },
                { type: 'sub', text: '- 家务分类新增「其他」选项' },
                { type: 'sub', text: '- 支持记录自定义家务项目' },
                { type: 'feature', text: '数据清空功能优化' },
                { type: 'sub', text: '- 实现自定义确认对话框' },
                { type: 'sub', text: '- 清空后自动刷新页面' },
                { type: 'fix', text: '修复清空数据时取消按钮无效问题' },
                { type: 'fix', text: '修复按钮宽度与文字不匹配问题' }
            ]
        },
        {
            date: '2026-05-08',
            version: 'v1.4.0',
            title: '主题与功能优化',
            items: [
                { type: 'feature', text: '新增森系主题' },
                { type: 'sub', text: '- 日式杂志清新绿色配色，氧气感十足' },
                { type: 'sub', text: '- 淡雅薄荷绿主色调，温柔治愈' },
                { type: 'feature', text: '新增奶油主题' },
                { type: 'sub', text: '- 温暖奶油色系，柔和米黄配色' },
                { type: 'sub', text: '- 适合喜欢温暖柔和风格的用户' },
                { type: 'feature', text: '元气值兑换页面优化' },
                { type: 'sub', text: '- 卡片反转后仅显示引导语，移除按钮' },
                { type: 'sub', text: '- 添加三条治愈提示语，增强沉浸感' },
                { type: 'sub', text: '- 卡片高度增加，内容更充实' },
                { type: 'feature', text: '报表分析时间范围预设' },
                { type: 'sub', text: '- 新增快捷选择：过去一周/一月/半年/一年' },
                { type: 'sub', text: '- 选择后自动填充日期并生成报表' },
                { type: 'sub', text: '- 下拉框样式与日期选择框匹配' },
                { type: 'feature', text: '零食下拉框修复' },
                { type: 'sub', text: '- 移至页面最外层，避免被运动模块遮挡' },
                { type: 'sub', text: '- 添加滚动跟随，下拉框随页面滚动移动' },
                { type: 'feature', text: '页面结构调整' },
                { type: 'sub', text: '- 删除饮食分析页面，简化导航栏' },
                { type: 'sub', text: '- 元气值页面更名为"元气值兑换"' },
                { type: 'sub', text: '- 调整导航顺序：数据录入 → 报表分析 → 元气值兑换 → 历史记录 → 更新日志' },
                { type: 'feature', text: '主题切换功能优化' },
                { type: 'sub', text: '- 四个主题可自由切换：法式、宋式、森系、奶油' },
                { type: 'sub', text: '- 主题设置自动保存，刷新页面后保持' },
                { type: 'fix', text: '修复取消覆盖记录功能' },
                { type: 'sub', text: '- 用户选择"取消覆盖"后记录不再被覆盖' },
                { type: 'sub', text: '- 添加取消按钮与保存按钮分开设置' },
                { type: 'fix', text: '修复页面加载时的JavaScript错误' },
                { type: 'sub', text: '- 移除已删除页面的事件监听代码' },
                { type: 'sub', text: '- 修复updateDietStats未定义错误' }
            ]
        },
        {
            date: '2026-05-07',
            version: 'v1.3.0',
            title: '功能更新',
            items: [
                { type: 'feature', text: '各因素影响权重雷达图' },
                { type: 'sub', text: '- 显示六个维度（三餐、运动、心情、睡眠、家务、身体）得分' },
                { type: 'sub', text: '- 紫色代表当前期，橙色代表对比期' },
                { type: 'sub', text: '- 使用各维度实际最高分作为外圈基准' },
                { type: 'feature', text: '不吃零食打卡功能' },
                { type: 'sub', text: '- 当天没有吃零食会显示蓝色标记' },
                { type: 'sub', text: '- 支持图例筛选查看特定类型打卡' },
                { type: 'feature', text: '打卡日历图例筛选' },
                { type: 'sub', text: '- 点击图例可筛选显示特定类型打卡' },
                { type: 'sub', text: '- 支持运动、家务、不吃零食三种类型筛选' },
                { type: 'feature', text: '历史记录CSV导出' },
                { type: 'sub', text: '- 支持选择日期区间导出' },
                { type: 'sub', text: '- 文件名为日期范围标识，便于管理' },
                { type: 'feature', text: '各维度平均得分对比功能' },
                { type: 'sub', text: '- 默认对比"上周"，可选择"上月"、"去年同期"或"上一期"' },
                { type: 'sub', text: '- 显示箭头指示变化方向（↑上升/↓下降/→持平）' },
                { type: 'sub', text: '- 显示具体分数变化值' },
                { type: 'feature', text: '零食分数计入三餐' },
                { type: 'sub', text: '- 修改了计算逻辑，零食分数自动计入三餐总分' },
                { type: 'feature', text: '参考能量值卡片优化' },
                { type: 'sub', text: '- 点击卡片可编辑参考能量值' },
                { type: 'sub', text: '- 编辑完成后恢复紫色卡片样式' },
                { type: 'sub', text: '- 悬停显示"点击编辑"提示' },
                { type: 'feature', text: '新增更新日志页面' },
                { type: 'sub', text: '- 记录工具的更新历史' },
                { type: 'sub', text: '- 支持按日期分组显示' },
                { type: 'feature', text: '报表分析字体统一' },
                { type: 'sub', text: '- 所有数字和文字使用相同字体' },
                { type: 'sub', text: '- 统一字号和粗细' },
                { type: 'fix', text: '修复雷达图对比期交叉线问题' },
                { type: 'fix', text: '修复历史记录编辑时零食记录丢失问题' },
                { type: 'fix', text: '修复能量解读中峰值谷值日期显示错误' },
                { type: 'fix', text: '删除了"关键结论"模块，界面更简洁' }
            ]
        }
    ];
    
    localStorage.setItem('updateLogs', JSON.stringify(sampleLogs));
}

// 更新日志功能
function addLog(date, type, description) {
    const logs = JSON.parse(localStorage.getItem('updateLogs') || '[]');
    const today = date;
    
    // 查找今天的日志记录
    let todayLog = logs.find(log => log.date === today);
    
    if (!todayLog) {
        todayLog = {
            date: today,
            entries: []
        };
        logs.push(todayLog);
    }
    
    // 确保 entries 属性存在
    if (!todayLog.entries) {
        todayLog.entries = [];
    }
    
    // 添加新的日志条目
    todayLog.entries.push({
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        type: type,
        description: description
    });
    
    // 按时间倒序排列日志
    logs.sort((a, b) => b.date.localeCompare(a.date));
    
    localStorage.setItem('updateLogs', JSON.stringify(logs));
    
    // 如果当前在日志页面，刷新显示
    if (document.getElementById('log').classList.contains('active')) {
        loadLogs();
    }
}

// 加载日志
function loadLogs() {
    const logs = JSON.parse(localStorage.getItem('updateLogs') || '[]');
    const logList = document.getElementById('logList');
    
    if (logs.length === 0) {
        logList.innerHTML = '<p class="empty-message">暂无更新记录</p>';
        return;
    }
    
    let html = '';
    logs.forEach(dayLog => {
        const dateObj = new Date(dayLog.date + 'T00:00:00');
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[dateObj.getDay()];
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        
        html += `
            <div class="log-item">
                <div class="log-item-header">
                    <span class="log-date">📅 ${month}/${day} (${weekday})</span>
                    ${dayLog.version ? `<span class="log-version">${dayLog.version}</span>` : ''}
                </div>
                ${dayLog.title ? `<h3 class="log-title">${dayLog.title}</h3>` : ''}
                <ul class="log-changes">
        `;
        
        if (dayLog.items) {
            dayLog.items.forEach(item => {
                html += `
                    <li class="log-change log-${item.type}">${item.text}</li>
                `;
            });
        } else if (dayLog.entries) {
            dayLog.entries.forEach(entry => {
                html += `
                    <li class="log-change log-${entry.type}">${entry.description} <span class="log-time">${entry.time}</span></li>
                `;
            });
        }
        
        html += `
                </ul>
            </div>
        `;
    });
    
    logList.innerHTML = html;
}

// 页面加载时初始化报表和历史记录
document.addEventListener('DOMContentLoaded', function() {
    // 初始化示例日志（首次加载）
    initSampleLogs();
    
    // 初始化元气值（不再自动重新计算，避免覆盖用户兑换消耗）
    getVitality();
    
    // 初始化零食分数显示
    calculateSnackScore();
    
    // 检查健康预警
    const warning = checkHealthWarning();
    if (warning) {
        showHealthWarning(warning);
    }
    
    // 总是加载日志（确保日志页面有内容）
    loadLogs();
    
    // 如果当前激活的是报表或历史记录，加载数据
    if (document.getElementById('report').classList.contains('active')) {
        generateReport();
    } else if (document.getElementById('history').classList.contains('active')) {
        loadHistory();
        loadVitalityHistory();
    }
    
});

// 绘制雷达图
function drawRadarChart(meal, exercise, mood, sleep, chore, health,
    prevMeal, prevExercise, prevMood, prevSleep, prevChore, prevHealth) {
    
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    const labels = ['三餐', '运动', '心情', '睡眠', '家务', '身体'];
    // 各维度实际最高分（三餐=3餐x15分，运动=45，心情=20，睡眠=30，家务=30，身体=20）
    const maxScores = [45, 45, 20, 30, 30, 20];
    const values = [meal, exercise, mood, sleep, chore, health];
    const prevValues = [prevMeal, prevExercise, prevMood, prevSleep, prevChore, prevHealth];
    const angleStep = (Math.PI * 2) / labels.length;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景网格 - 使用更柔和的颜色
    const gridLevels = 5;
    for (let i = 1; i <= gridLevels; i++) {
        const r = radius * (i / gridLevels);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // 绘制轴线和维度最高分标签
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < labels.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        
        // 绘制轴线 - 使用更柔和的颜色
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 绘制维度名称和最高分
        const labelRadius = radius + 22;
        const labelX = centerX + Math.cos(angle) * labelRadius;
        const labelY = centerY + Math.sin(angle) * labelRadius;
        ctx.fillText(labels[i], labelX, labelY);
        
        // 在维度名称下方显示最高分
        const scoreRadius = radius + 36;
        const scoreX = centerX + Math.cos(angle) * scoreRadius;
        const scoreY = centerY + Math.sin(angle) * scoreRadius;
        ctx.fillText(`(${maxScores[i]})`, scoreX, scoreY);
    }
    
    // 绘制对比期数据（雅致金色）
    if (prevValues.some(v => v > 0)) {
        const prevPoints = prevValues.map((v, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const value = Math.max(0, Math.min(v / maxScores[i], 1));
            return {
                x: centerX + Math.cos(angle) * radius * value,
                y: centerY + Math.sin(angle) * radius * value,
                angle: angle,
                value: value
            };
        });
        
        const sortedPrevPoints = [...prevPoints].sort((a, b) => a.angle - b.angle);
        
        ctx.beginPath();
        ctx.moveTo(sortedPrevPoints[0].x, sortedPrevPoints[0].y);
        for (let i = 1; i < sortedPrevPoints.length; i++) {
            ctx.lineTo(sortedPrevPoints[i].x, sortedPrevPoints[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(217, 179, 128, 0.15)';
        ctx.fill('nonzero');
        ctx.strokeStyle = '#D9B380';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // 绘制当前期数据（高级灰蓝）
    const currPoints = values.map((v, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const value = Math.min(v / maxScores[i], 1);
        return {
            x: centerX + Math.cos(angle) * radius * value,
            y: centerY + Math.sin(angle) * radius * value
        };
    });
    
    ctx.beginPath();
    ctx.moveTo(currPoints[0].x, currPoints[0].y);
    for (let i = 1; i < currPoints.length; i++) {
        ctx.lineTo(currPoints[i].x, currPoints[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(79, 95, 120, 0.25)';
    ctx.fill('nonzero');
    ctx.strokeStyle = '#4F5F78';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // 绘制中心点
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4F5F78';
    ctx.fill();
    
    // 绘制当前期数据点
    currPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4F5F78';
        ctx.fill();
        ctx.strokeStyle = '#FAFAFA';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });
}

// 节气背景图映射
const solarTerms = [
    { name: '立春', emoji: '🌱', bgClass: 'bg-spring' },
    { name: '雨水', emoji: '💧', bgClass: 'bg-rain' },
    { name: '惊蛰', emoji: '🐛', bgClass: 'bg-awaken' },
    { name: '春分', emoji: '⚖️', bgClass: 'bg-spring-equinox' },
    { name: '清明', emoji: '🌸', bgClass: 'bg-blossom' },
    { name: '谷雨', emoji: '🌧️', bgClass: 'bg-rainy' },
    { name: '立夏', emoji: '🌿', bgClass: 'bg-summer' },
    { name: '小满', emoji: '🌾', bgClass: 'bg-grain' },
    { name: '芒种', emoji: '🌾', bgClass: 'bg-harvest' },
    { name: '夏至', emoji: '☀️', bgClass: 'bg-summer-solstice' },
    { name: '小暑', emoji: '🔥', bgClass: 'bg-hot' },
    { name: '大暑', emoji: '🌡️', bgClass: 'bg-scorching' },
    { name: '立秋', emoji: '🍂', bgClass: 'bg-autumn' },
    { name: '处暑', emoji: '🌤️', bgClass: 'bg-cool' },
    { name: '白露', emoji: '💦', bgClass: 'bg-dew' },
    { name: '秋分', emoji: '🍁', bgClass: 'bg-autumn-equinox' },
    { name: '寒露', emoji: '🌬️', bgClass: 'bg-cold' },
    { name: '霜降', emoji: '❄️', bgClass: 'bg-frost' },
    { name: '立冬', emoji: '🍂', bgClass: 'bg-winter' },
    { name: '小雪', emoji: '🌨️', bgClass: 'bg-light-snow' },
    { name: '大雪', emoji: '❄️', bgClass: 'bg-heavy-snow' },
    { name: '冬至', emoji: '☃️', bgClass: 'bg-winter-solstice' },
    { name: '小寒', emoji: '🧊', bgClass: 'bg-very-cold' },
    { name: '大寒', emoji: '⛄', bgClass: 'bg-extreme-cold' }
];

// 《全芳备祖》植物数据库 - 花部
const flowerDatabase = [
    { name: '梅花', emoji: '🌸', category: 'flower', description: '梅，天下尤物，独步早春，傲霜雪而不凋，尤为可贵。' },
    { name: '牡丹', emoji: '🌺', category: 'flower', description: '牡丹，花之富贵者也。硕大艳丽，香气馥郁，冠绝群芳。' },
    { name: '兰花', emoji: '🌿', category: 'flower', description: '兰，君子之花。生于幽谷，不以无人而不芳，品格高洁。' },
    { name: '菊花', emoji: '🌼', category: 'flower', description: '菊，花之隐逸者。凌霜而开，不畏严寒，品高雅。' },
    { name: '荷花', emoji: '🪷', category: 'flower', description: '莲，出淤泥而不染，濯清涟而不妖，亭亭净植。' },
    { name: '海棠', emoji: '🌺', category: 'flower', description: '海棠，花中神仙。娇艳优美，远望如霞，近观似画。' },
    { name: '桃花', emoji: '🌸', category: 'flower', description: '桃，春之使者。三月花开，满树灿烂，如霞似锦。' },
    { name: '杏花', emoji: '🌸', category: 'flower', description: '杏，花色白里透红，娇艳动人，香气袭人。' },
    { name: '梨花', emoji: '🍐', category: 'flower', description: '梨，花白如雪，素洁淡雅，飘落如雪花飞舞。' },
    { name: '月季', emoji: '🌹', category: 'flower', description: '月季，花中皇后。四季常开，花色丰富，姿态万千。' },
    { name: '山茶', emoji: '🌺', category: 'flower', description: '山茶，冬春开花，不畏严寒，花大色艳。' },
    { name: '水仙', emoji: '🌼', category: 'flower', description: '水仙，凌波仙子。水中亭亭玉立，清香淡雅。' },
    { name: '杜鹃', emoji: '🌺', category: 'flower', description: '杜鹃，花色艳丽，如火如荼，满山遍野。' },
    { name: '蔷薇', emoji: '🌹', category: 'flower', description: '蔷薇，蔓生多刺，花香浓郁，烂漫可爱。' },
    { name: '茉莉', emoji: '🌸', category: 'flower', description: '茉莉，花白如玉，香气清幽，令人沉醉。' },
    { name: '木芙蓉', emoji: '🌺', category: 'flower', description: '木芙蓉，秋花之冠，一日三变，娇艳多姿。' },
    { name: '芍药', emoji: '🌼', category: 'flower', description: '芍药，花相也。富丽堂皇，与牡丹并称。' },
    { name: '桂花', emoji: '🌼', category: 'flower', description: '桂，八月飘香，芬芳四溢，沁人心脾。' },
    { name: '栀子', emoji: '🌸', category: 'flower', description: '栀子，花白如玉，香气浓郁，纯洁高雅。' },
    { name: '含笑', emoji: '🌺', category: 'flower', description: '含笑，花开如笑，香气清幽，娇羞动人。' },
    { name: '萱草', emoji: '🌼', category: 'flower', description: '萱草，忘忧草也。花色艳丽，令人忘忧。' },
    { name: '玉簪', emoji: '🌸', category: 'flower', description: '玉簪，花白如簪，高洁素雅，清香宜人。' },
    { name: '木槿', emoji: '🌺', category: 'flower', description: '木槿，朝开暮落，荣枯有时，生生不息。' },
    { name: '紫薇', emoji: '🌸', category: 'flower', description: '紫薇，花繁色艳，花期绵长，烂漫可爱。' },
    { name: '石榴', emoji: '🌸', category: 'flower', description: '石榴，花红似火，果实饱满，多子多福。' },
    { name: '丁香', emoji: '🌸', category: 'flower', description: '丁香，花小而繁，香气馥郁，幽怨动人。' },
    { name: '玉兰', emoji: '🌸', category: 'flower', description: '玉兰，花大洁白，高雅端庄，早春盛开。' },
    { name: '迎春', emoji: '🌼', category: 'flower', description: '迎春，早春开花，金黄灿烂，迎接春光。' },
    { name: '紫荆', emoji: '🌸', category: 'flower', description: '紫荆，花繁叶茂，团团簇簇，光彩夺目。' },
    { name: '紫藤', emoji: '🌸', category: 'flower', description: '紫藤，蔓生缠绕，花穗下垂，紫韵悠长。' },
    { name: '绣球', emoji: '🌸', category: 'flower', description: '绣球，花如球形，丰满圆润，花色多变。' },
    { name: '凤仙', emoji: '🌺', category: 'flower', description: '凤仙，花色丰富，可染指甲，活泼可爱。' },
    { name: '鸡冠', emoji: '🌼', category: 'flower', description: '鸡冠，花形如冠，色彩艳丽，奇特有趣。' },
    { name: '牵牛', emoji: '🌸', category: 'flower', description: '牵牛，蔓生缠绕，花开如喇叭，朝开暮合。' },
    { name: '萱花', emoji: '🌼', category: 'flower', description: '萱花，又名忘忧，花色金黄，令人愉悦。' },
    { name: '秋葵', emoji: '🌺', category: 'flower', description: '秋葵，花黄如葵，朝开暮落，清新淡雅。' },
    { name: '芙蓉', emoji: '🌺', category: 'flower', description: '芙蓉，花色艳丽，朝白暮红，娇艳动人。' },
    { name: '蜀葵', emoji: '🌺', category: 'flower', description: '蜀葵，高大挺拔，花色丰富，艳丽多姿。' },
    { name: '睡莲', emoji: '🪷', category: 'flower', description: '睡莲，浮水而生，花姿优美，恬静淡雅。' },
    { name: '菖蒲', emoji: '🌿', category: 'flower', description: '菖蒲，生于水边，叶形如剑，香气清新。' },
    // 果部
    { name: '荔枝', emoji: '🍒', category: 'fruit', description: '荔枝，果肉晶莹，甘甜多汁，岭南佳果。' },
    { name: '龙眼', emoji: '🍇', category: 'fruit', description: '龙眼，圆如弹丸，肉白如脂，甘甜可口。' },
    { name: '柑橘', emoji: '🍊', category: 'fruit', description: '柑橘，金黄圆润，酸甜可口，生津止渴。' },
    { name: '柚子', emoji: '🍈', category: 'fruit', description: '柚子，硕大饱满，清香爽口，润肺化痰。' },
    { name: '枇杷', emoji: '🍑', category: 'fruit', description: '枇杷，形如金丸，果肉细腻，酸甜适度。' },
    { name: '杨梅', emoji: '🍒', category: 'fruit', description: '杨梅，红如玛瑙，酸甜可口，生津开胃。' },
    { name: '橄榄', emoji: '🫒', category: 'fruit', description: '橄榄，初涩后甘，回味悠长，清热解毒。' },
    { name: '银杏', emoji: '🌰', category: 'fruit', description: '银杏，形如小杏，果仁甘美，益寿延年。' },
    { name: '板栗', emoji: '🌰', category: 'fruit', description: '板栗，壳硬肉糯，香甜可口，营养丰富。' },
    { name: '核桃', emoji: '🫘', category: 'fruit', description: '核桃，补脑益智，果仁饱满，风味独特。' },
    { name: '枣', emoji: '🫒', category: 'fruit', description: '枣，味甘性温，补中益气，养血安神。' },
    { name: '柿', emoji: '🍅', category: 'fruit', description: '柿，红如灯笼，甘甜多汁，健脾养胃。' },
    { name: '梨', emoji: '🍐', category: 'fruit', description: '梨，清甜多汁，润肺止咳，清热降火。' },
    { name: '桃', emoji: '🍑', category: 'fruit', description: '桃，果肉细腻，香甜多汁，益颜色，解劳乏。' },
    { name: '李', emoji: '🍒', category: 'fruit', description: '李，酸甜可口，清肝热，生津液。' },
    { name: '梅', emoji: '🍒', category: 'fruit', description: '梅，酸中带甜，可制蜜饯，开胃消食。' },
    { name: '杏', emoji: '🍑', category: 'fruit', description: '杏，果肉柔软，酸甜适度，润肺止咳。' },
    { name: '石榴', emoji: '🍒', category: 'fruit', description: '石榴，籽如红宝，酸甜多汁，多子多福。' },
    { name: '葡萄', emoji: '🍇', category: 'fruit', description: '葡萄，晶莹剔透，酸甜可口，益气补血。' },
    { name: '苹果', emoji: '🍎', category: 'fruit', description: '苹果，清香脆甜，健脾益胃，生津止渴。' },
    // 木部
    { name: '松', emoji: '🌲', category: 'tree', description: '松，岁寒三友之一，四季常青，坚韧不拔。' },
    { name: '竹', emoji: '🎋', category: 'tree', description: '竹，中空有节，挺拔修长，君子之象征。' },
    { name: '柏', emoji: '🌲', category: 'tree', description: '柏，枝叶茂密，四季常青，庄重肃穆。' },
    { name: '柳', emoji: '🌳', category: 'tree', description: '柳，枝条柔软，随风摇曳，婀娜多姿。' },
    { name: '杨', emoji: '🌳', category: 'tree', description: '杨，高大挺拔，生长迅速，姿态雄伟。' },
    { name: '槐', emoji: '🌳', category: 'tree', description: '槐，枝叶繁茂，树形优美，吉祥之树。' },
    { name: '榆', emoji: '🌳', category: 'tree', description: '榆，质地坚硬，用途广泛，朴实无华。' },
    { name: '桑', emoji: '🌳', category: 'tree', description: '桑，叶可饲蚕，果可食用，全身是宝。' },
    { name: '樟', emoji: '🌳', category: 'tree', description: '樟，香气浓郁，防虫防腐，材质优良。' },
    { name: '桂', emoji: '🌳', category: 'tree', description: '桂，八月飘香，芬芳四溢，沁人心脾。' },
    { name: '枫', emoji: '🍂', category: 'tree', description: '枫，秋季叶红，如火似锦，美不胜收。' },
    { name: '梧桐', emoji: '🌳', category: 'tree', description: '梧桐，高大挺拔，枝叶繁茂，凤凰来栖。' },
    { name: '榕', emoji: '🌳', category: 'tree', description: '榕，枝繁叶茂，独木成林，生命力强。' },
    { name: '棕榈', emoji: '🌴', category: 'tree', description: '棕榈，热带风情，四季常青，用途广泛。' },
    { name: '冬青', emoji: '🌲', category: 'tree', description: '冬青，四季常青，不畏严寒，坚韧不拔。' },
    // 药部
    { name: '人参', emoji: '🌿', category: 'herb', description: '人参，百草之王，大补元气，益寿延年。' },
    { name: '当归', emoji: '🌿', category: 'herb', description: '当归，补血活血，调经止痛，妇科圣药。' },
    { name: '黄芪', emoji: '🌿', category: 'herb', description: '黄芪，补气升阳，固表止汗，利水消肿。' },
    { name: '甘草', emoji: '🌿', category: 'herb', description: '甘草，调和诸药，清热解毒，润肺止咳。' },
    { name: '枸杞', emoji: '🌿', category: 'herb', description: '枸杞，滋补肝肾，明目养颜，延年益寿。' },
    { name: '山药', emoji: '🌿', category: 'herb', description: '山药，补脾养胃，生津益肺，补肾涩精。' },
    { name: '茯苓', emoji: '🍄', category: 'herb', description: '茯苓，利水渗湿，健脾宁心，安神益智。' },
    { name: '白术', emoji: '🌿', category: 'herb', description: '白术，健脾益气，燥湿利水，安胎止汗。' },
    { name: '川芎', emoji: '🌿', category: 'herb', description: '川芎，活血行气，祛风止痛，血中气药。' },
    { name: '白芍', emoji: '🌿', category: 'herb', description: '白芍，养血调经，敛阴止汗，柔肝止痛。' },
    { name: '地黄', emoji: '🌿', category: 'herb', description: '地黄，滋阴补血，益精填髓，凉血止血。' },
    { name: '麦冬', emoji: '🌿', category: 'herb', description: '麦冬，养阴生津，润肺清心，益胃生津。' },
    { name: '陈皮', emoji: '🍊', category: 'herb', description: '陈皮，理气健脾，燥湿化痰，消食开胃。' },
    { name: '半夏', emoji: '🌿', category: 'herb', description: '半夏，燥湿化痰，降逆止呕，消痞散结。' },
    { name: '金银花', emoji: '🌸', category: 'herb', description: '金银花，清热解毒，疏散风热，芳香宜人。' },
    { name: '连翘', emoji: '🌸', category: 'herb', description: '连翘，清热解毒，消肿散结，疮家圣药。' },
    { name: '薄荷', emoji: '🌿', category: 'herb', description: '薄荷，疏散风热，清利头目，疏肝行气。' },
    { name: '藿香', emoji: '🌿', category: 'herb', description: '藿香，化湿解暑，和中止呕，芳香化浊。' },
    { name: '苍术', emoji: '🌿', category: 'herb', description: '苍术，燥湿健脾，祛风散寒，明目开窍。' },
    { name: '厚朴', emoji: '🌿', category: 'herb', description: '厚朴，行气消胀，燥湿消痰，下气宽中。' }
];

// 获取随机植物主题
function getRandomPlantTheme() {
    return flowerDatabase[Math.floor(Math.random() * flowerDatabase.length)];
}

// 获取当前节气
function getCurrentSolarTerm() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${month}-${day}`;
    
    const solarTermsWithDate = [
        { name: '立春', emoji: '🌱', bgClass: 'bg-spring', date: '02-04' },
        { name: '雨水', emoji: '💧', bgClass: 'bg-rain', date: '02-19' },
        { name: '惊蛰', emoji: '🐛', bgClass: 'bg-awaken', date: '03-06' },
        { name: '春分', emoji: '⚖️', bgClass: 'bg-spring-equinox', date: '03-21' },
        { name: '清明', emoji: '🌸', bgClass: 'bg-blossom', date: '04-05' },
        { name: '谷雨', emoji: '🌧️', bgClass: 'bg-rainy', date: '04-20' },
        { name: '立夏', emoji: '🌿', bgClass: 'bg-summer', date: '05-06' },
        { name: '小满', emoji: '🌾', bgClass: 'bg-grain', date: '05-21' },
        { name: '芒种', emoji: '🌾', bgClass: 'bg-harvest', date: '06-06' },
        { name: '夏至', emoji: '☀️', bgClass: 'bg-summer-solstice', date: '06-22' },
        { name: '小暑', emoji: '🔥', bgClass: 'bg-hot', date: '07-07' },
        { name: '大暑', emoji: '🌡️', bgClass: 'bg-scorching', date: '07-23' },
        { name: '立秋', emoji: '🍂', bgClass: 'bg-autumn', date: '08-08' },
        { name: '处暑', emoji: '🌤️', bgClass: 'bg-cool', date: '08-23' },
        { name: '白露', emoji: '💦', bgClass: 'bg-dew', date: '09-08' },
        { name: '秋分', emoji: '🍁', bgClass: 'bg-autumn-equinox', date: '09-23' },
        { name: '寒露', emoji: '🌬️', bgClass: 'bg-cold', date: '10-08' },
        { name: '霜降', emoji: '❄️', bgClass: 'bg-frost', date: '10-24' },
        { name: '立冬', emoji: '🍂', bgClass: 'bg-winter', date: '11-08' },
        { name: '小雪', emoji: '🌨️', bgClass: 'bg-light-snow', date: '11-22' },
        { name: '大雪', emoji: '❄️', bgClass: 'bg-heavy-snow', date: '12-07' },
        { name: '冬至', emoji: '☃️', bgClass: 'bg-winter-solstice', date: '12-22' },
        { name: '小寒', emoji: '🧊', bgClass: 'bg-very-cold', date: '01-06' },
        { name: '大寒', emoji: '⛄', bgClass: 'bg-extreme-cold', date: '01-20' }
    ];
    
    for (let i = 0; i < solarTermsWithDate.length; i++) {
        const nextTerm = solarTermsWithDate[(i + 1) % solarTermsWithDate.length];
        const nextDate = nextTerm.date;
        
        if (todayStr >= solarTermsWithDate[i].date && todayStr < nextDate) {
            return solarTermsWithDate[i];
        }
    }
    return solarTermsWithDate[0];
}

// 获取随机花卉主题
function getRandomFlowerTheme() {
    return flowerThemes[Math.floor(Math.random() * flowerThemes.length)];
}

// 节气养生建议
const solarTermAdvice = {
    '立春': '立春养生，宜早睡早起，顺应阳气生发。建议散步、慢跑，多食辛温食物。',
    '雨水': '雨水时节，湿气渐增，注意保暖防湿。宜食健脾祛湿的食物如薏米、红豆。',
    '惊蛰': '惊蛰春雷动，万物复苏。宜适当增加运动量，多食清淡食物。',
    '春分': '春分昼夜平分，阴阳平衡。宜保持规律作息，多吃时令蔬菜。',
    '清明': '清明时节，天气晴朗，宜踏青郊游。饮食宜清淡，忌油腻。',
    '谷雨': '谷雨时节，雨量增多，空气湿润。宜健脾养胃，多食豆类。',
    '立夏': '立夏养生，重在养心。宜晚睡早起，适当午休，清淡饮食。',
    '小满': '小满时节，湿热交加。宜清热利湿，多吃新鲜蔬果。',
    '芒种': '芒种忙种，宜劳逸结合。饮食清淡，避免贪凉。',
    '夏至': '夏至阳气最盛，宜防暑降温。晚睡早起，适当午休。',
    '小暑': '小暑炎热，宜防暑祛湿。多吃清热解暑食物如西瓜、绿豆。',
    '大暑': '大暑酷热，宜静心防暑。饮食清淡，注意补充水分。',
    '立秋': '立秋养生，宜滋阴润肺。多食白色食物如百合、银耳。',
    '处暑': '处暑炎热未消，宜清热安神。早睡早起，适当运动。',
    '白露': '白露时节，天气转凉，宜滋阴润燥。多食梨、蜂蜜。',
    '秋分': '秋分昼夜平分，宜养阴防燥。饮食温润，适当进补。',
    '寒露': '寒露天气转冷，宜保暖防寒。多食温热食物。',
    '霜降': '霜降时节，气温骤降，宜温补脾肾。注意添衣保暖。',
    '立冬': '立冬养生，宜养精蓄锐。适当进补，早睡晚起。',
    '小雪': '小雪寒冷，宜温补脾肾。多食黑色食物如黑豆、黑芝麻。',
    '大雪': '大雪严寒，宜保暖御寒。适当锻炼，增强体质。',
    '冬至': '冬至养生，宜温补阳气。多食羊肉、桂圆等温性食物。',
    '小寒': '小寒严寒，宜养肾防寒。早睡晚起，注意保暖。',
    '大寒': '大寒最冷，宜固本培元。适当进补，保持室内通风。'
};

// 获取节气建议
function getSolarTermAdvice(name) {
    return solarTermAdvice[name] || getRandomQuote();
}

// 励志语录
const motivationalQuotes = [
    '每一天都是新的开始，加油！💪',
    '积少成多，坚持就是胜利！✨',
    '记录生活，遇见更好的自己 🌟',
    '能量满满，元气十足！⚡',
    '小步快跑，终达目标！🚀',
    '今天的努力，明天的收获 🌱',
    '健康是一切的基础 💎',
    '用心生活，感受美好 💕',
    '自律给我自由 💪',
    '越努力，越幸运 🍀',
    '每一天都值得被记录 📝',
    '生活明朗，万物可爱 🌈',
    '把日子过成诗 📜',
    '岁月静好，温暖相伴 ❤️',
    '元气满满，活力四射 ⚡',
    '向阳而生，逐光而行 ☀️'
];

// 获取随机语录
function getRandomQuote() {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
}

// 书签标题前缀
const titlePrefixes = [
    '今日能量记录',
    '我的能量日记',
    '元气满满',
    '记录美好',
    '能量打卡',
    '今日收获',
    '生活点滴',
    '每日能量'
];

// 获取随机标题前缀
function getRandomTitlePrefix() {
    return titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
}

// 显示书签弹窗
function showBookmarkModal(record, energy) {
    // 使用《全芳备祖》植物数据库
    const theme = getRandomPlantTheme();
    
    const today = new Date(record.date);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    document.getElementById('bookmarkDate').textContent = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;
    
    // 设置背景样式
    const bookmarkBg = document.getElementById('bookmarkBg');
    bookmarkBg.textContent = theme.emoji;
    
    // 根据类别设置背景颜色
    const categoryColors = {
        'flower': '#FFB6C1',    // 粉色 - 花卉
        'fruit': '#FFA500',     // 橙色 - 果实
        'tree': '#228B22',      // 绿色 - 树木
        'herb': '#9370DB'       // 紫色 - 药材
    };
    bookmarkBg.style.color = categoryColors[theme.category] || '#FFB6C1';
    
    // 根据类别设置图标
    const categoryIcons = {
        'flower': '🌸',
        'fruit': '🍒',
        'tree': '🌳',
        'herb': '🌿'
    };
    
    // 使用植物名称和类别作为标题，添加出处（美学推荐格式）
    const icon = categoryIcons[theme.category] || '🌸';
    document.getElementById('bookmarkTitle').textContent = `${icon} ${theme.name} · 《全芳备祖》`;
    
    let statsHtml = '';
    if (energy.meal > 0) statsHtml += `<div class="bookmark-stat-item"><span class="bookmark-stat-label">🍽️ 三餐得分</span><span class="bookmark-stat-value">${energy.meal}分</span></div>`;
    if (energy.exercise > 0) statsHtml += `<div class="bookmark-stat-item"><span class="bookmark-stat-label">🏃 运动得分</span><span class="bookmark-stat-value">${energy.exercise}分</span></div>`;
    if (energy.mood > 0) statsHtml += `<div class="bookmark-stat-item"><span class="bookmark-stat-label">😊 心情得分</span><span class="bookmark-stat-value">${energy.mood}分</span></div>`;
    if (energy.sleep > 0) statsHtml += `<div class="bookmark-stat-item"><span class="bookmark-stat-label">😴 睡眠得分</span><span class="bookmark-stat-value">${energy.sleep}分</span></div>`;
    if (energy.chore > 0) statsHtml += `<div class="bookmark-stat-item"><span class="bookmark-stat-label">🧹 家务得分</span><span class="bookmark-stat-value">${energy.chore}分</span></div>`;
    statsHtml += `<div class="bookmark-stat-item"><span class="bookmark-stat-label">⚡ 今日能量</span><span class="bookmark-stat-value">${energy.total}分</span></div>`;
    
    document.getElementById('bookmarkStats').innerHTML = statsHtml;
    
    // 显示《全芳备祖》中的花卉描述
    document.getElementById('bookmarkQuote').textContent = theme.description || getRandomQuote();
    
    document.getElementById('bookmarkModal').classList.add('active');
}

// 关闭书签弹窗
document.getElementById('closeBookmark').addEventListener('click', function() {
    document.getElementById('bookmarkModal').classList.remove('active');
});

// 保存书签图片
document.getElementById('saveImageBtn').addEventListener('click', function() {
    const bookmarkContent = document.getElementById('bookmarkContent');
    
    html2canvas(bookmarkContent).then(canvas => {
        const link = document.createElement('a');
        link.download = `energy-record-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

// 分享书签
document.getElementById('shareBtn').addEventListener('click', function() {
    const stats = document.getElementById('bookmarkStats').innerText;
    const quote = document.getElementById('bookmarkQuote').innerText;
    const shareText = `今日能量记录\n${stats}\n\n${quote}`;
    
    if (navigator.share) {
        navigator.share({
            title: '能量记录',
            text: shareText
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            alert('已复制到剪贴板，您可以粘贴分享到其他平台！');
        }).catch(err => {
            // 剪贴板权限被拒绝，显示文本让用户手动复制
            const textarea = document.createElement('textarea');
            textarea.value = shareText;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert('已复制到剪贴板，您可以粘贴分享到其他平台！');
            } catch (e) {
                // 显示文本让用户手动复制
                alert(`分享内容：\n\n${shareText}\n\n请手动复制以上内容分享到其他平台。`);
            }
            document.body.removeChild(textarea);
        });
    }
});

// 心愿列表
// 元气值能量兑换体系 - 5层进阶体验
const wishes = [
    // 第一层：低能耗｜轻度释放（门槛最低，日常攒几天就能解锁）
    { id: 1, icon: '🚶', title: '傍晚慢走一刻钟', cost: 100, description: '漫无目的楼下慢走，放空思绪', tier: 1, tierName: '低能耗｜轻度释放', guide: '换上舒适的鞋子，关掉手机通知，慢慢走在小区或公园里。感受脚下的路，听听周围的声音，让思绪自然流动，不必刻意思考任何事情。' },
    { id: 2, icon: '☕', title: '安静慢饮时光', cost: 150, description: '泡一杯喜欢的饮品，不看手机安静慢饮', tier: 1, tierName: '低能耗｜轻度释放', guide: '选一杯你喜欢的茶或咖啡，找一个安静的角落坐下。关掉手机，专注于饮品的香气和口感，慢慢品味，让时间慢下来。' },
    { id: 3, icon: '💬', title: '轻松闲聊一会', cost: 120, description: '和同频好友简短闲聊，只聊轻松闲话', tier: 1, tierName: '低能耗｜轻度释放', guide: '约上一位让你感到放松的朋友，聊一些轻松愉快的话题。不必有压力，只享受当下的交流时光。' },
    { id: 4, icon: '🎵', title: '治愈纯音乐', cost: 100, description: '窝在安静角落，听一整段治愈纯音乐', tier: 1, tierName: '低能耗｜轻度释放', guide: '找一个舒适的姿势躺下或坐下，戴上耳机，播放你喜欢的纯音乐。闭上眼睛，让旋律带你进入平静的世界。' },
    { id: 5, icon: '🧹', title: '轻整理桌面', cost: 130, description: '简单整理桌面小角落，给生活做一次轻梳理', tier: 1, tierName: '低能耗｜轻度释放', guide: '花10分钟整理你的桌面，把杂物归位，擦去灰尘。一个整洁的空间会让你的心情也变得清爽。' },
    { id: 6, icon: '😌', title: '睡前静心放空', cost: 140, description: '睡前放下所有心事，提前半小时静心放空', tier: 1, tierName: '低能耗｜轻度释放', guide: '睡前半小时放下手机，躺在床上做几个深呼吸。让身体放松，让思绪慢慢沉淀，为一夜好眠做准备。' },
    { id: 7, icon: '🌿', title: '绿地静坐', cost: 110, description: '去附近绿地坐一会，吹风发呆不胡思乱想', tier: 1, tierName: '低能耗｜轻度释放', guide: '找一片绿地或公园的长椅坐下，感受微风拂面，听听鸟鸣声。什么都不用做，只是静静地享受自然。' },
    { id: 8, icon: '🧘', title: '完全无安排', cost: 150, description: '给自己留半小时完全无安排，纯发呆放空', tier: 1, tierName: '低能耗｜轻度释放', guide: '给自己半小时"空白时间"，不安排任何事情。可以发呆、可以望着窗外、可以什么都不做，让身心彻底放松。' },
    { id: 9, icon: '👨👩👧👦', title: '家常闲聊', cost: 120, description: '和家人轻松聊几句家常，不带情绪不纠结', tier: 1, tierName: '低能耗｜轻度释放', guide: '和家人坐下来聊聊天，不需要什么主题，就说说今天发生的小事。感受家人之间温暖的连接。' },
    { id: 10, icon: '📖', title: '闲书慢读', cost: 130, description: '点一盏柔和灯光，安静看几页闲书', tier: 1, tierName: '低能耗｜轻度释放', guide: '选一本轻松的书，打开一盏温暖的小灯。不必追求速度，慢慢读，享受阅读的乐趣。' },
    
    // 第二层：中低能耗｜温柔滋养（需稳定攒能量一周左右）
    { id: 11, icon: '☀️', title: '午后留白时光', cost: 300, description: '抽一个午后完全留白，不处理工作琐事只取悦自己', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '给自己一个完整的午后，关掉工作消息。做任何你想做的事情，或者什么都不做。这是只属于你的时光。' },
    { id: 12, icon: '👭', title: '无目的闲逛', cost: 350, description: '约同频好友街边散步闲聊，无目的地闲逛', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '约上好友，随便选一个方向开始走。不必有目的地，走到哪里算哪里。享受在路上的时光和轻松的交谈。' },
    { id: 13, icon: '✍️', title: '心情随笔', cost: 280, description: '手写一段心情随笔，安放内心杂念', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '拿出纸笔，写下你此刻的心情。不必在意字迹工整或内容逻辑，只是把内心的想法释放出来。' },
    { id: 14, icon: '🌊', title: '湖边静坐', cost: 320, description: '独自去公园湖边静坐一个傍晚，感受自然安静', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '找一个湖边的位置坐下，看水波荡漾，听风声鸟鸣。让自然的宁静慢慢渗透到你的心里。' },
    { id: 15, icon: '🍳', title: '家常简餐', cost: 300, description: '和亲近的人吃一顿慢悠悠的家常简餐', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '准备一顿简单的家常饭，和家人或好友一起慢慢享用。不谈工作，只享受美食和陪伴。' },
    { id: 16, icon: '🔕', title: '沉浸式独处', cost: 380, description: '关掉社交消息半天，沉浸式享受独处时光', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '关掉所有社交软件的通知，给自己半天独处的时间。做一些能让你沉浸的事情，享受与自己相处。' },
    { id: 17, icon: '🌸', title: '生活装点', cost: 250, description: '给自己买一束小花，简单装点生活空间', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '买一束喜欢的花，找一个漂亮的花瓶插上。让小小的美好点缀你的生活空间，也点亮你的心情。' },
    { id: 18, icon: '📚', title: '读书冥想小聚', cost: 360, description: '参加一次小型安静读书/冥想小聚，低压力社交', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '参加一个轻松的小聚，大家安静地一起读书或冥想。不需要太多交流，感受同频的氛围就好。' },
    { id: 19, icon: '🌅', title: '清晨松弛', cost: 340, description: '晨起早起一次，安静感受清晨无人打扰的松弛', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '早起一小时，享受清晨的宁静。可以做一顿早餐，或者只是静静地看窗外，感受一天的开始。' },
    { id: 20, icon: '🎬', title: '治愈短片', cost: 290, description: '沉浸式看一部治愈短片，全程不被琐事打断', tier: 2, tierName: '中低能耗｜温柔滋养', guide: '选一部治愈的短片，关掉手机，全身心投入进去。让故事温暖你的心灵。' },
    
    // 第三层：中能耗｜生活仪式（需要持续稳攒能量，克制内耗）
    { id: 21, icon: '🍵', title: '茶室静坐', cost: 600, description: '预约茶室静坐一下午，喝茶放空与自己相处', tier: 3, tierName: '中能耗｜生活仪式', guide: '找一间安静的茶室，点一壶喜欢的茶。坐在窗边，看着茶叶在水中舒展，慢慢品味，让时间慢下来。' },
    { id: 22, icon: '🍵', title: '知己小聚', cost: 550, description: '和知己约咖啡馆小坐，走心浅聊不刻意找话题', tier: 3, tierName: '中能耗｜生活仪式', guide: '约上最懂你的朋友，找一间安静的咖啡馆。不必刻意找话题，想说就说，不想说就安静地一起喝咖啡。' },
    { id: 23, icon: '🌙', title: '一日早睡养心', cost: 650, description: '完整一日早睡养心，调整作息修复身心元气', tier: 3, tierName: '中能耗｜生活仪式', guide: '今天给自己放个假，早点睡，好好休息。让身体和心灵都得到充分的恢复。' },
    { id: 24, icon: '🗑️', title: '深度断舍离', cost: 700, description: '做一次深度小范围断舍离，清理杂物也清理情绪', tier: 3, tierName: '中能耗｜生活仪式', guide: '整理你的房间，把不再需要的东西清理掉。每丢掉一件物品，就像放下一份负担。' },
    { id: 25, icon: '🏮', title: '老巷慢漫游', cost: 580, description: '单人城市老巷慢漫游，逛老街、看烟火、放空自己', tier: 3, tierName: '中能耗｜生活仪式', guide: '找一条老巷子，慢慢走，看看老房子，听听市井的声音。感受时光在这里慢下来。' },
    { id: 26, icon: '👬', title: '同频小聚', cost: 620, description: '和三两同频好友小聚，不谈压力只享受松弛陪伴', tier: 3, tierName: '中能耗｜生活仪式', guide: '约上志同道合的朋友，一起做点轻松的事情。不需要太多言语，同频的人在一起就很舒服。' },
    { id: 27, icon: '🛁', title: '泡澡静养', cost: 560, description: '沉浸式泡澡静养，好好安抚疲惫身心', tier: 3, tierName: '中能耗｜生活仪式', guide: '放一池温水，加点浴盐或精油。躺在浴缸里，让温暖的水包裹着你，放松每一寸肌肤。' },
    { id: 28, icon: '📵', title: '远离电子产品', cost: 680, description: '远离电子产品整整半天，回归线下慢生活', tier: 3, tierName: '中能耗｜生活仪式', guide: '把手机放在一边，关掉电脑。做一些线下的事情，感受真实世界的美好。' },
    { id: 29, icon: '👨🍳', title: '精致简餐', cost: 540, description: '认真为自己做一顿精致简餐，慢慢享用不匆忙', tier: 3, tierName: '中能耗｜生活仪式', guide: '用心准备一顿简单但精致的饭菜，摆盘漂亮一点。坐下来慢慢吃，感受食物的味道。' },
    { id: 30, icon: '🌿', title: '草坪疗愈', cost: 520, description: '找一处安静草坪静坐，晒太阳、放空、疗愈情绪', tier: 3, tierName: '中能耗｜生活仪式', guide: '找一片柔软的草坪躺下，闭上眼睛，感受阳光照在脸上。让大自然治愈你的心灵。' },
    
    // 第四层：中高能耗｜身心深度体验（要长期低内耗、攒很久能量）
    { id: 31, icon: '🎊', title: '情绪假期', cost: 1200, description: '给自己安排一日「完全情绪假期」，不迁就任何人、不内耗', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '今天你可以做任何想做的事情，也可以什么都不做。不需要迁就任何人，只关注自己的感受。' },
    { id: 32, icon: '🥾', title: '近郊慢出行', cost: 1500, description: '单人近郊短途慢出行，不赶景点，随心走走停停', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '选一个近郊的地方，独自前往。没有行程安排，走到哪里算哪里，享受在路上的自由。' },
    { id: 33, icon: '🤝', title: '挚友慢旅行', cost: 1800, description: '和懂自己的挚友来一场一日慢旅行，节奏完全随心情', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '和最懂你的朋友一起去旅行。不需要赶时间，慢慢走，慢慢看，享受彼此陪伴的时光。' },
    { id: 34, icon: '🧘‍♀️', title: '深度冥想', cost: 1300, description: '完整周末上午静坐冥想，深度和内心对话', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '找一个安静的地方坐下，闭上眼睛，专注于呼吸。让思绪自然流动，倾听内心的声音。' },
    { id: 35, icon: '📖', title: '书店沉浸', cost: 1100, description: '独自去书店待大半天，沉浸式阅读、沉淀内心', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '找一家喜欢的书店，泡上大半天。选一本感兴趣的书，沉浸在文字的世界里。' },
    { id: 36, icon: '✏️', title: '热爱小事', cost: 1400, description: '刻意空出一整天，只做自己热爱的小事，无任何任务', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '今天只做让你快乐的事情。画画、弹琴、做饭、种花...任何你热爱的小事都值得投入。' },
    { id: 37, icon: '👨‍👩‍👧‍👦', title: '家庭短途游', cost: 1600, description: '和家人安排一次轻松短途散步出游，松弛陪伴', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '和家人一起去附近的公园或景点走走。不需要走太远，享受彼此陪伴的温暖时光。' },
    { id: 38, icon: '✉️', title: '给自己的信', cost: 1250, description: '深度梳理情绪，写一封给自己的信封存留念', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '坐下来给自己写一封信，说说心里话。可以是感恩、可以是期许，写完后封存起来，未来的你会感谢现在的自己。' },
    { id: 39, icon: '🎬', title: '沉浸式追剧', cost: 1350, description: '沉浸式追剧/纪录片一整天，彻底放空疗愈自己', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '选一部喜欢的剧或纪录片，准备好零食和饮料。今天什么都不想，就沉浸在故事里。' },
    { id: 40, icon: '🏡', title: '治愈小角落', cost: 1450, description: '布置专属治愈小角落，插花、摆件、营造私人安心空间', tier: 4, tierName: '中高能耗｜身心深度体验', guide: '找家里的一个小角落，用心布置一下。放上喜欢的花、香薰、照片，打造一个只属于你的治愈空间。' },
    
    // 第五层：高能耗｜高阶人生稀缺体验（最高门槛，长期养能量才能解锁）
    { id: 41, icon: '🌌', title: '独居放空假期', cost: 3000, description: '安排一次单人独居放空小假期，一晚独处彻底疗愈', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '找一个安静的地方独处一晚。关掉手机，远离喧嚣。这是只属于你自己的时光，好好和自己相处。' },
    { id: 42, icon: '🚙', title: '灵魂同频旅行', cost: 4000, description: '和灵魂同频的好友，来一场两天一夜慢节奏小旅行', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '和那个最懂你的朋友一起去旅行。不需要太多计划，随心而行，享受灵魂共鸣的美好时光。' },
    { id: 43, icon: '📜', title: '人生深度复盘', cost: 3500, description: '抽完整一天做人生深度复盘，和解过往、梳理执念、安顿内心', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '给自己一整天的时间，安静地回顾过去。原谅过去的自己，放下执念，让内心得到安宁。' },
    { id: 44, icon: '🏘️', title: '小镇慢住', cost: 3800, description: '去安静小镇慢住一日，脱离日常喧嚣，沉浸式慢生活', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '选一个安静的小镇，住上一晚。感受小镇的慢节奏，让身心都慢下来。' },
    { id: 45, icon: '🌅', title: '周末放空假', cost: 4200, description: '给自己放完整周末放空假，不工作、不应酬、只滋养自己', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '这个周末，什么都不安排。不工作、不应酬，只做让自己开心的事情。好好滋养自己。' },
    { id: 46, icon: '🧘‍♂️', title: '心灵成长沙龙', cost: 3200, description: '参加一场深度心灵成长/静心疗愈线下小沙龙', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '参加一个心灵成长的沙龙，和一群同频的人一起探索内心。在这里，你会找到共鸣和力量。' },
    { id: 47, icon: '🌳', title: '山野静心徒步', cost: 3600, description: '远离城市喧嚣，找山野林间静心徒步一日', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '走进大自然，在山野林间徒步。听鸟鸣、闻花香，让大自然的能量治愈你的心灵。' },
    { id: 48, icon: '🔐', title: '彻底断联', cost: 3400, description: '刻意断开所有工作社交一整天，彻底守住自己的心神能量', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '今天，彻底断开所有联系。关掉手机，屏蔽外界干扰。守住自己的心神，享受纯粹的宁静。' },
    { id: 49, icon: '🍲', title: '独处盛宴', cost: 4500, description: '安排一次只为自己的仪式感独处盛宴，从饮食到环境全取悦自己', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '为自己准备一场盛宴。从精致的食物到温馨的环境，每一个细节都只为取悦自己。' },
    { id: 50, icon: '📆', title: '年度成长梳理', cost: 5000, description: '沉淀身心，做年度内在成长梳理，记录自己的情绪与生命变化', tier: 5, tierName: '高能耗｜高阶人生稀缺体验', guide: '找一个安静的地方，回顾这一年的成长。记录下你的变化和感悟，感谢自己的每一步。' }
];

// 重新计算元气值（根据所有记录的能量值总和）
function recalculateVitality() {
    const records = JSON.parse(localStorage.getItem('energyRecords') || '[]');
    let totalVitality = 0;
    const accumulatedDates = [];
    
    records.forEach(record => {
        if (record.energy) {
            totalVitality += parseInt(record.energy) || 0;
            accumulatedDates.push(record.date);
        }
    });
    
    localStorage.setItem('vitality', totalVitality.toString());
    localStorage.setItem('accumulatedDates', JSON.stringify(accumulatedDates));
    
    return totalVitality;
}