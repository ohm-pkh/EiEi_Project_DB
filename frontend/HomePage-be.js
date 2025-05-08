

let movie_data;
window.onload = async () => {
  const response = await check_auth();
  if(response.Role =='admin'){
    window.location.href='dash.html';
  }
  if(response.profile_img){
    const profile_img = document.getElementById('Profile_img')
    profile_img.src = response.profile_img ? `http://localhost:8000${response.profile_img}` : 'http://localhost:8000/img/userProfile/Default.png';
  }
  await loadData();
}

document.querySelector('.register-form').addEventListener('submit', async function(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);  // Collect all form data including the image

  const email = formData.get('email');     
  const password = formData.get('password'); 
  const conpassword = formData.get('password_confirm');     
  const fname = formData.get('fname'); 
  const username = formData.get('username');     
  const gender = formData.get('gender'); 
  const image = formData.get('image'); 

  const error_post = document.querySelector('.inv-register');
  
  if (password !== conpassword) {
    error_post.innerHTML = 'Confirm password does not match.';
  } else {
    try {
      const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        body: formData  // Send FormData, which includes the image
      });

      const data = await response.json();
      if (!data.error) {
        localStorage.setItem('token', data.token);
        window.location.reload();
      } else {
        error_post.innerHTML = data.message;
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
});



document.querySelector('.login-form').addEventListener('submit', async function(event) {
  event.preventDefault(); // prevent page reload

  const form = event.target;
  const formData = new FormData(form);

  const email = formData.get('Email');     
  const password = formData.get('Password'); 
  console.log(email);

  try {
    const response = await fetch('http://localhost:8000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    console.log(data);

    if (!data.error) {
      localStorage.setItem('token',data.token)
      console.log(data.role)
      if(data.Role === 'admin'){
        window.location.href='dash.html';
      }else{
        window.location.reload();
      }
      
      
    } else {
      const error_show = document.querySelector('.inv-login');
      error_show.innerHTML=`${data.message}`;
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

const check_auth = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return { auth: false };
  }

  try {
    const response = await axios.get('http://localhost:8000/auth', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem('token');
    return { auth: false };
  }
};

const UserOnclick = async () => {
  const response = await check_auth();
  console.log(response);
  if (response.auth === true) {
    if(response.Role === 'admin'){
      window.location.href='dash.html';
    }else{
      console.log('User is authenticated:', response);
      window.location.href= 'UserProfile.html';
    }
    
  } else {
    openOverlay('login-overlay');
  }
};



// Then use it like this:
const loadUser = async () => {
  const user = await getUserData();
  console.log(user); // here is your variable
};


const loadData = async () => {
  // Clear containers
  document.querySelector('.movie-scoller-container').innerHTML = '';
  document.querySelector('#Current-movie-container .movie-container').innerHTML = '';
  document.querySelector('#Recommend-movie-container .movie-container').innerHTML = '';
  document.querySelector('#Upcoming-movie-container .movie-container').innerHTML = '';

  try {
    const response = await axios.get('http://localhost:8000/Homepage');
    console.log('data received');
    const data = response.data;

    for (const row of data) {
      if (row.status === 'Currently play') {
        await appendCurrent(row);
        await appendTop(row);
      } else if (row.status === 'Recommend') {
        await appendRec(row);
      } else if (row.status === 'Upcoming') {
        await appendUpComing(row);
      }
    }

    const firstMovie = document.querySelector('.movie-scoller-container').firstChild;
    if (firstMovie) {
      goFocus(firstMovie);
    }

  } catch (error) {
    console.error('Error loading data:', error.message);
  }
};

const appendTop = async (row) =>{
  const container = document.querySelector('.movie-scoller-container');
  let div = document.createElement('div');
  div.className = 'movie';
  div.tabIndex = 0;
  div.setAttribute('onclick', 'goFocus(this)');
  div.setAttribute('bg_img',row.background_img);
  div.style.backgroundImage=`url("http://localhost:8000${row.poster_img}")`;
  div.innerHTML = `
            <div class="movie-info-container">
                <div class="Title">${row.title}</div>
                <button onclick='goBooking(this.id)' id='${row.movie_id}'>Book Now</button>
            </div>
        `;
  container.appendChild(div);
}


const appendCurrent = async(row)=>{
  const container = document.querySelector('#Current-movie-container .movie-container');
  let div = document.createElement('div');
  div.innerHTML = `
  <div class="movie" tabindex="0" style='background-image: url("http://localhost:8000${row.poster_img}");' onclick='goBooking(this.id)' id='${row.movie_id}'>
    <div class="movie-lable">
      <div class="title">
        ${row.title}
      </div>
      <div class="other-info">
        <div class = "date">
          ${row.release_date}
        </div>
        <div class = "genre">
            ${row.genre}
        </div>
      </div>
    </div>
  </div> `;
  container.appendChild(div);
}

const appendRec = async(row) =>{
  const container = document.querySelector('#Recommend-movie-container .movie-container');
  let div = document.createElement('div');
  div.innerHTML = `
  <div class="movie" tabindex="0" style='background-image: url("http://localhost:8000${row.poster_img}");' onclick='goBooking(this.id)' id='${row.movie_id}'>
    <div class="movie-lable">
      <div class="title">
        ${row.title}
      </div>
      <div class="other-info">
        <div class = "date">
          ${row.release_date}
        </div>
        <div class = "genre">
            ${row.genre}
        </div>
      </div>
    </div>
  </div> `;
  container.appendChild(div);

}


const appendUpComing = async(row) =>{
  const container = document.querySelector('#Upcoming-movie-container .movie-container');
  let div = document.createElement('div');
  div.innerHTML = `
  <div class="movie" tabindex="0" style='background-image: url("http://localhost:8000${row.poster_img}");' id='${row.movie_id}'>
    <div class="movie-lable">
      <div class="title">
        ${row.title}
      </div>
      <div class="other-info">
        <div class = "date">
          ${row.release_date}
        </div>
        <div class = "genre">
            ${row.genre}
        </div>
      </div>
    </div>
  </div> `;
  container.appendChild(div);

}
