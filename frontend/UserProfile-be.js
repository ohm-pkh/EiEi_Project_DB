
window.onload = async () => {
  await Userinfo();
}

const Userinfo = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Something wrong')
    window.location.href = 'Homepage.html';
  }

  try {
    const response = await axios.get('http://localhost:8000/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log(response.data);
    const user_info = response.data;
    const header_fname = document.querySelector('.header-fname');
    const header_userId = document.querySelector('.header-user-id');
    const fname = document.querySelector('#fname');
    const Uname = document.querySelector('#Uname');
    const gender = document.querySelector('#gender');
    const email = document.querySelector('#email');
    const Jdate = document.querySelector('#Jdate');
    const Profileimg = document.querySelector('.Profileimg');
    header_fname.innerHTML = user_info.fname;
    header_userId.innerHTML += user_info.user_id;
    fname.innerHTML = user_info.fname;
    Uname.innerHTML = user_info.username;
    gender.innerHTML = user_info.gender;
    email.innerHTML = user_info.email;
    Jdate.innerHTML = user_info.join_date;
    Profileimg.src = `http://localhost:8000${user_info.profile}`
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem('token');
    alert('Something wrong')
    window.location.href = 'Homepage.html';
  }
};

function logout(){
  localStorage.removeItem('token');
  window.location.href = 'Homepage.html';
}