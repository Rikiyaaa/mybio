//discord-integration.js

/**
 * Discord Integration Frontend Script
 * 
 * ไฟล์นี้จัดการเชื่อมต่อกับ WebSocket server และ API server
 * เพื่อแสดงสถานะ Discord แบบ real-time
 */

// ตั้งค่าการเชื่อมต่อ
const CONFIG = {
    // เปลี่ยนเป็น URL ของ API server ของคุณ
    apiUrl: 'https://discord-info-api.onrender.com/api/discord',
    // เปลี่ยนเป็น URL ของ WebSocket server ของคุณ
    websocketUrl: 'wss://http://localhost:3001',  // ไม่จำเป็นต้องกำหนดพอร์ต 3001
    // Discord User ID ที่ต้องการแสดงข้อมูล (ต้องตรงกับที่ตั้งค่าในฝั่ง backend)
    userId: '918384557131173988',
    // API key ถ้ามีการตั้งค่าในฝั่ง backend
    apiKey: '' // ใส่ API key ถ้าจำเป็น
  };
  
  // ตัวแปรสำหรับเก็บการเชื่อมต่อ WebSocket
  let websocket = null;
  // ตัวแปรสำหรับเก็บข้อมูล timeout ของการเชื่อมต่อใหม่
  let reconnectTimeout = null;
  // ตัวแปรสำหรับเก็บข้อมูล timeout ของการ ping
  let pingInterval = null;
  
  // DOM Elements
  const elements = {
    statusIndicator: document.getElementById('discord-status-indicator'),
    avatar: document.getElementById('discord-avatar'),
    username: document.getElementById('discord-username'),
    statusText: document.getElementById('discord-status-text'),
    time: document.getElementById('discord-time'),
  };
  
  /**
   * เริ่มต้นการเชื่อมต่อกับ API และ WebSocket
   */
  function initDiscordIntegration() {
    console.log('Initializing Discord integration...');
    
    // ดึงข้อมูลเริ่มต้นจาก API
    fetchInitialData();
    
    // เชื่อมต่อกับ WebSocket server
    connectWebSocket();
  }
  
  /**
   * ดึงข้อมูลเริ่มต้นจาก API server
   */
  async function fetchInitialData() {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/user/${CONFIG.userId}`, {
        headers: CONFIG.apiKey ? { 'X-API-Key': CONFIG.apiKey } : {}
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      let userData = await response.json();
      
      // สำหรับการทดสอบ
      userData.flags = (1 << 6) | (1 << 22); // HypeSquad Bravery และ Active Developer
      userData.premium_type = 2; // Nitro Premium
      userData.avatar_decoration = true; // มี decoration
      
      updateUserInterface(userData);
      
    } catch (error) {
      console.error('Error fetching initial user data:', error);
      elements.username.textContent = 'ไม่สามารถโหลดข้อมูลได้';
      elements.statusText.textContent = 'ไม่สามารถโหลดสถานะได้';
    }
  }
  
  /**
   * เชื่อมต่อกับ WebSocket server
   */
  function connectWebSocket() {
    // หากมีการเชื่อมต่ออยู่แล้ว ให้ปิดก่อน
    if (websocket) {
      websocket.close();
    }
    
    // ใส่ userId เป็น query parameter
    const wsUrl = `${CONFIG.websocketUrl}?userId=${CONFIG.userId}`;
    
    console.log('Connecting to WebSocket server:', wsUrl);
    websocket = new WebSocket(wsUrl);
    
    // Event handlers
    websocket.onopen = handleWebSocketOpen;
    websocket.onmessage = handleWebSocketMessage;
    websocket.onclose = handleWebSocketClose;
    websocket.onerror = handleWebSocketError;
  }
  
  /**
   * จัดการเมื่อเชื่อมต่อ WebSocket สำเร็จ
   */
  function handleWebSocketOpen() {
    console.log('WebSocket connection established');
    elements.time.textContent = 'เชื่อมต่อสำเร็จ';
    
    // เริ่มต้นส่ง ping ทุกๆ 30 วินาที เพื่อรักษาการเชื่อมต่อ
    pingInterval = setInterval(() => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000);
    
    // ขอข้อมูลล่าสุด
    requestLatestData();
  }
  
  /**
   * ขอข้อมูลล่าสุดจาก WebSocket server
   */
  function requestLatestData() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ type: 'getLatestData' }));
    }
  }

  /**
 * อัพเดต Badge จาก userData
 */
function updateUserBadges(userData) {
    const badgesElement = document.getElementById('discord-badges');
    if (!badgesElement) return;
    
    // เคลียร์ badges เดิม
    badgesElement.innerHTML = '';
    
    // ตรวจสอบ Nitro
    if (userData.premium_type) {
        const nitroBadge = document.createElement('div');
        nitroBadge.className = 'discord-badge';
        nitroBadge.setAttribute('data-tooltip', 'Nitro Subscriber');
        nitroBadge.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff73fa">
                <path d="M2.98966977,9.35789159 C2.98966977,9.77582472 2.63442946,10.1240466 2.20807287,10.1240466 L1.78171628,10.1240466 C1.35535969,10.1240466 0.999948837,9.77582472 0.999948837,9.35789159 C0.999948837,8.93995846 1.35535969,8.59173658 1.78171628,8.59173658 L2.20807287,8.59173658 C2.63442946,8.59173658 2.98966977,8.93995846 2.98966977,9.35789159 Z M22.2467643,9.14892503 C24.0942527,12.9800344 22.3888264,17.5772989 18.3384388,19.3882867 C14.4302837,21.1297305 9.74036124,19.457998 7.9638186,15.6268886 C7.60857829,14.8607335 7.3954,14.0248673 7.32428372,13.189001 L5.76091938,13.189001 C5.33456279,13.189001 4.97932248,12.840612 4.97932248,12.4226788 C4.97932248,12.0047457 5.33456279,11.6565238 5.76091938,11.6565238 L8.03493488,11.6565238 C8.46129147,11.6565238 8.81653178,11.3083019 8.81653178,10.8903688 C8.81653178,10.4724357 8.46129147,10.1240466 8.03493488,10.1240466 L4.41090388,10.1240466 C3.98454729,10.1240466 3.62913643,9.77582472 3.62913643,9.35789159 C3.62913643,8.93995846 3.98454729,8.59173658 4.41090388,8.59173658 L9.45606667,8.59173658 C9.88242326,8.59173658 10.2376636,8.24334752 10.2376636,7.82541439 C10.2376636,7.40748126 9.88242326,7.05925937 9.45606667,7.05925937 L7.3954,7.05925937 C6.75586512,7.05925937 6.18727597,6.57161499 6.18727597,5.87517123 C6.18727597,5.24827153 6.68474884,4.69091591 7.3954,4.69091591 L15.4250589,4.69091591 C18.267493,4.8303384 20.9676946,6.43235968 22.2467643,9.14892503 Z"/>
            </svg>
        `;
        badgesElement.appendChild(nitroBadge);
    }
    
    // ตรวจสอบ flags
    if (userData.flags) {
        const badges = [
            { flag: 1 << 0, name: 'Discord Staff', icon: 'staff.svg' },
            { flag: 1 << 1, name: 'Discord Partner', icon: 'partner.svg' },
            { flag: 1 << 2, name: 'Hypesquad Events', icon: 'hypesquad_events.svg' },
            { flag: 1 << 3, name: 'Bug Hunter Level 1', icon: 'bug_hunter_1.svg' },
            { flag: 1 << 6, name: 'Hypesquad Bravery', icon: 'hypesquad_bravery.svg' },
            { flag: 1 << 7, name: 'Hypesquad Brilliance', icon: 'hypesquad_brilliance.svg' },
            { flag: 1 << 8, name: 'Hypesquad Balance', icon: 'hypesquad_balance.svg' },
            { flag: 1 << 9, name: 'Early Supporter', icon: 'early_supporter.svg' },
            { flag: 1 << 14, name: 'Bug Hunter Level 2', icon: 'bug_hunter_2.svg' },
            { flag: 1 << 16, name: 'Verified Bot Developer', icon: 'verified_developer.svg' },
            { flag: 1 << 17, name: 'Early Verified Bot Developer', icon: 'verified_developer.svg' },
            { flag: 1 << 18, name: 'Discord Moderator', icon: 'moderator.svg' },
            { flag: 1 << 19, name: 'Bot HTTP Interactions', icon: 'bot.svg' },
            { flag: 1 << 22, name: 'Active Developer', icon: 'active_developer.svg' }
        ];
        
        badges.forEach(badge => {
            if (userData.flags & badge.flag) {
                const badgeElement = document.createElement('div');
                badgeElement.className = 'discord-badge';
                badgeElement.setAttribute('data-tooltip', badge.name);
                badgeElement.innerHTML = `<img src="/api/placeholder/16/16" alt="${badge.name}">`;
                badgesElement.appendChild(badgeElement);
            }
        });
    }
}
  
  /**
   * เพิ่ม Profile Decoration
   */
  function addProfileDecoration(userData) {
    const avatarContainer = document.querySelector('.discord-avatar');
    if (!avatarContainer) return;
    
    // ลบ decoration เดิมถ้ามี
    const existingDecoration = avatarContainer.querySelector('.discord-profile-decorations');
    if (existingDecoration) {
        existingDecoration.remove();
    }
    
    // เพิ่ม decoration ใหม่ถ้ามี
    if (userData.avatar_decoration) {
        const decorationElement = document.createElement('div');
        decorationElement.className = 'discord-profile-decorations';
        decorationElement.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="35" stroke="url(#paint0_linear)" stroke-width="3" fill="none"/>
                <defs>
                    <linearGradient id="paint0_linear" x1="10" y1="10" x2="70" y2="70" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#5865F2"/>
                        <stop offset="0.5" stop-color="#EB459E"/>
                        <stop offset="1" stop-color="#FC7916"/>
                    </linearGradient>
                </defs>
            </svg>
        `;
        avatarContainer.appendChild(decorationElement);
    }
  }
  
  // อัพเดต function updateUserInterface เพื่อเรียกใช้ฟังก์ชันใหม่
  function updateUserInterface(userData) {
    if (!userData) return;
    
    console.log('Updating UI with user data:', userData);
    
    // อัพเดตข้อมูลพื้นฐาน
    elements.username.textContent = userData.globalName || userData.username;
    
    // อัพเดต avatar
    if (userData.avatar) {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`;
      elements.avatar.src = avatarUrl;
    }
    
    // อัพเดตสถานะ
    if (userData.presence) {
      updatePresenceUI(userData.presence);
    }
    
    // อัพเดต badges
    updateUserBadges(userData);
    
    // เพิ่ม profile decoration
    addProfileDecoration(userData);
  }
  
  /**
   * จัดการข้อมูลที่ได้รับจาก WebSocket
   */
  function handleWebSocketMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'userData':
          updateUserInterface(data.data);
          break;
          
        case 'presenceUpdate':
          updatePresenceUI(data.data);
          break;
          
        case 'connected':
          console.log('Connection message:', data.message);
          break;
          
        case 'pong':
          // ได้รับการตอบกลับจาก ping
          console.log('Received pong:', new Date(data.timestamp));
          break;
          
        case 'error':
          console.error('Error from WebSocket server:', data.message);
          elements.statusText.textContent = 'เกิดข้อผิดพลาด';
          break;
          
        default:
          console.log('Unknown message type:', data.type, data);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }
  
  /**
   * จัดการเมื่อการเชื่อมต่อ WebSocket ถูกปิด
   */
  function handleWebSocketClose(event) {
    console.log('WebSocket connection closed:', event.code, event.reason);
    elements.time.textContent = 'การเชื่อมต่อถูกปิด';
    
    // ยกเลิก ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    // พยายามเชื่อมต่อใหม่หลังจาก 5 วินาที
    if (!event.wasClean) {
      console.log('Attempting to reconnect in 5 seconds...');
      reconnectTimeout = setTimeout(connectWebSocket, 5000);
    }
  }
  
  /**
   * จัดการข้อผิดพลาดของ WebSocket
   */
  function handleWebSocketError(error) {
    console.error('WebSocket error:', error);
    elements.time.textContent = 'การเชื่อมต่อผิดพลาด';
  }
  
  /**
   * อัพเดต UI ตามข้อมูลผู้ใช้
   */
 /**
 * อัพเดต UI ตามข้อมูลผู้ใช้
 */
/**
 * อัพเดต UI ตามข้อมูลผู้ใช้
 */
function updateUserInterface(userData) {
    if (!userData) return;
    
    console.log('Updating UI with user data:', userData);
    
    // อัพเดตข้อมูลพื้นฐาน
    // เปลี่ยนจากการใส่ข้อความปกติเป็นการใส่ข้อความพร้อมรูปภาพ
    const usernameContainer = document.createElement('div');
    usernameContainer.style.display = 'flex';
    usernameContainer.style.alignItems = 'center';
    usernameContainer.style.gap = '5px';
    
    const usernameText = document.createElement('span');
    usernameText.textContent = userData.globalName || userData.username;
    
    const badgeImage1 = document.createElement('img');
    badgeImage1.src = 'https://discordresources.com/img/hypesquadbrilliance.svg'; // เปลี่ยนเป็น URL รูปภาพที่ต้องการสำหรับรูปแรก
    badgeImage1.alt = 'Badge 1';
    badgeImage1.style.width = '20px';
    badgeImage1.style.height = '20px';
    
    const badgeImage2 = document.createElement('img');
    badgeImage2.src = 'https://discordresources.com/img/quest.png'; // เปลี่ยนเป็น URL รูปภาพที่ต้องการสำหรับรูปที่สอง
    badgeImage2.alt = 'Badge 2';
    badgeImage2.style.width = '18px';
    badgeImage2.style.height = '18px';
    
    const badgeImage3 = document.createElement('img');
    badgeImage3.src = 'https://discordresources.com/img/supportscommands.svg'; // เปลี่ยนเป็น URL รูปภาพที่ต้องการสำหรับรูปที่สาม
    badgeImage3.alt = 'Badge 3';
    badgeImage3.style.width = '20px';
    badgeImage3.style.height = '20px';
    
    usernameContainer.appendChild(usernameText);
    usernameContainer.appendChild(badgeImage1);
    usernameContainer.appendChild(badgeImage2);
    usernameContainer.appendChild(badgeImage3);
    
    // เคลียร์เนื้อหาเก่าและใส่เนื้อหาใหม่
    elements.username.innerHTML = '';
    elements.username.appendChild(usernameContainer);
    
    // อัพเดต avatar
    if (userData.avatar) {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`;
      elements.avatar.src = avatarUrl;
    }
    
    // อัพเดตสถานะ
    if (userData.presence) {
      updatePresenceUI(userData.presence);
    }
    
    // อัพเดต badges
    updateUserBadges(userData);
    
    // เพิ่ม profile decoration
    addProfileDecoration(userData);
  }
  
  /**
   * อัพเดต UI สถานะจาก presence data
   */
  function updatePresenceUI(presenceData) {
    if (!presenceData) return;
    
    console.log('Updating presence UI:', presenceData);
    
    // อัพเดตสถานะสี
    updateStatusColor(presenceData.status);
    
    // อัพเดตข้อความสถานะ
    updateStatusText(presenceData);
    
    // อัพเดตเวลา
    elements.time.textContent = `อัพเดตล่าสุด: 1 นาทีที่เเล้ว`;
    
    // ตรวจสอบว่ามีกิจกรรมเพลงหรือไม่
    checkForMusicActivity(presenceData.activities);
  }
  
  /**
   * อัพเดตสีของสถานะ
   */
  function updateStatusColor(status) {
    // เคลียร์ class เดิม
    elements.statusIndicator.className = 'discord-status';
    
    // เพิ่ม class ตามสถานะ
    switch (status) {
      case 'online':
        elements.statusIndicator.classList.add('status-online');
        break;
      case 'idle':
        elements.statusIndicator.classList.add('status-idle');
        break;
      case 'dnd':
        elements.statusIndicator.classList.add('status-dnd');
        break;
      case 'offline':
      default:
        elements.statusIndicator.classList.add('status-offline');
        break;
    }
  }
  
  /**
   * อัพเดตข้อความสถานะ
   */
  function updateStatusText(presenceData) {
    let statusText = getStatusTranslation(presenceData.status);
    
    // ถ้ามีกิจกรรม ให้แสดงกิจกรรมแทน
    if (presenceData.activities && presenceData.activities.length > 0) {
      const activity = presenceData.activities[0]; // ใช้กิจกรรมแรก
      
      switch (activity.type) {
        case 0: // Playing
          statusText = `กำลังเล่น ${activity.name}`;
          break;
        case 1: // Streaming
          statusText = `กำลังสตรีม ${activity.name}`;
          break;
        case 2: // Listening
          statusText = `กำลังฟัง ${activity.name}`;
          break;
        case 3: // Watching
          statusText = `กำลังดู ${activity.name}`;
          break;
        case 4: // Custom
          statusText = activity.state || (activity.emoji ? activity.emoji.name : statusText);
          break;
        case 5: // Competing
          statusText = `กำลังแข่งขันใน ${activity.name}`;
          break;
      }
      
      // เพิ่มรายละเอียดถ้ามี
      if (activity.details) {
        statusText += ` - ${activity.details}`;
      }
    }
    
    elements.statusText.textContent = statusText;
  }
  
  /**
   * แปลสถานะเป็นภาษาไทย
   */
  function getStatusTranslation(status) {
    switch (status) {
      case 'online': return 'ออนไลน์';
      case 'idle': return 'ไม่อยู่';
      case 'dnd': return 'ห้ามรบกวน';
      case 'offline': return 'ออฟไลน์';
      default: return 'ไม่ทราบสถานะ';
    }
  }
  
  /**
   * ตรวจสอบว่ามีกิจกรรมเล่นเพลงหรือไม่
   */
  function checkForMusicActivity(activities) {
    if (!activities || activities.length === 0) return;
    
    // ค้นหากิจกรรมประเภท "Listening to Spotify" หรือเล่นเพลงอื่นๆ
    const musicActivity = activities.find(activity => 
      activity.type === 2 || // Listening
      (activity.type === 0 && // Playing
       (activity.name.includes('Spotify') || 
        activity.name.includes('Music') || 
        activity.name.includes('YouTube Music') ||
        activity.name.includes('Apple Music')))
    );
    
    if (musicActivity) {
      console.log('Found music activity:', musicActivity);
      updateMusicPlayer(musicActivity);
    }
  }
  
  /**
   * อัพเดต UI ของ Music Player
   */
  function updateMusicPlayer(activity) {
    // ส่วนนี้จะทำงานหากมีการอัพเดต music player จริงๆ
    // ในตัวอย่างนี้จะเป็นการจำลองการอัพเดตเท่านั้น
    
    const musicTitleElement = document.querySelector('.music-title');
    const musicArtistElement = document.querySelector('.music-artist');
    
    if (musicTitleElement && musicArtistElement) {
      if (activity.details) {
        musicTitleElement.textContent = activity.details; // ชื่อเพลง
      }
      
      if (activity.state) {
        musicArtistElement.textContent = activity.state; // ชื่อศิลปิน
      }
    }
  }
  
  /**
   * ฟอร์แมตเวลาให้อ่านง่าย
   */
  function formatTime(timestamp) {
    if (!timestamp) return 'ไม่ทราบ';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
  
  // เริ่มต้นเมื่อโหลดหน้าเว็บเสร็จ
  document.addEventListener('DOMContentLoaded', () => {
    // สร้าง CSS สำหรับสถานะ
    createStatusStyles();
    
    // เริ่มต้นการเชื่อมต่อ
    initDiscordIntegration();
  });
  
  /**
   * สร้าง CSS สำหรับสถานะต่างๆ
   */
  function createStatusStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .discord-status {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid #fff;
      }
      
      .status-online {
        background-color: #43b581;
      }
      
      .status-idle {
        background-color: #faa61a;
      }
      
      .status-dnd {
        background-color: #f04747;
      }
      
      .status-offline {
        background-color: #747f8d;
      }
      
      .discord-activity-status {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      
      .discord-activity-status svg {
        width: 16px;
        height: 16px;
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
  // จัดการการทำงานของ Music Player
  document.addEventListener('DOMContentLoaded', () => {
    // จำลองการทำงานของปุ่มเล่น/หยุด
    const playBtn = document.getElementById('play-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        // สลับระหว่างไอคอนเล่นและหยุด
        if (playIcon.style.display !== 'none') {
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'block';
        } else {
          playIcon.style.display = 'block';
          pauseIcon.style.display = 'none';
        }
        
        // จำลองการเล่น/หยุดเพลง
        const music = document.getElementById('bg-music');
        if (music) {
          if (music.paused) {
            music.play();
          } else {
            music.pause();
          }
        }
      });
    }
    
    // จำลองความคืบหน้าของเพลง
    let progress = 0;
    const musicProgress = document.getElementById('music-progress');
    
    setInterval(() => {
      if (pauseIcon.style.display !== 'none') {
        progress = (progress + 1) % 100;
        if (musicProgress) {
          musicProgress.style.width = `${progress}%`;
        }
      }
    }, 1000);
  });