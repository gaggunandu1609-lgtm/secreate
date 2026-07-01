const socket = io();

document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.card');
  const loadingOverlay = document.getElementById('loading-overlay');
  
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const actionMessage = card.getAttribute('data-action');
      
      // Emit the message via Socket.io
      socket.emit('send_message', { text: actionMessage });
      
      // Show success overlay temporarily
      loadingOverlay.classList.remove('hidden');
      
      setTimeout(() => {
        loadingOverlay.classList.add('hidden');
      }, 1500);
    });
  });
});
