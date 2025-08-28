// Mock Liferay User for Development/Testing
// In production, this would be injected by Liferay
window.LIFERAY_USER = {
  id: 'user_' + Math.random().toString(36).substr(2, 9),
  name: 'João Silva'
};

console.log('Mock Liferay user loaded:', window.LIFERAY_USER);