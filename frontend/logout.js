document.querySelector('.logout').addEventListener('click',()=>{
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem('token');
    window.location.href = 'Homepage.html';
  }
})
