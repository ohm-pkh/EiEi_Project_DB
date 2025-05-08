const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const Day = Date.now();
let formattedDate;

window.onload = async () => {
  const response = await check_auth();
  if(response.Role =='admin'){
    window.location.href='dash.html';
  }
  if(response.profile_img){
    const profile_img = document.getElementById('Profile_img')
    profile_img.src = response.profile_img ? `http://localhost:8000${response.profile_img}` : 'http://localhost:8000/img/userProfile/Default.png';
  }
  await ConstructDetailBox();
  await ConstructShowTimeBox();
}



const ConstructDetailBox = async () => {
    try{
        const response = await axios.get(`http://localhost:8000/Choose_th?id=${movieId}`);
        const movie_data = response.data;
        formattedDate = movie_data[0].next_show_date; 
        const container = document.querySelector('.movie-detail-container');
        console.log('data',movie_data[0].title);
        container.innerHTML =`
        <div class="poster" style="background-image : url('http://localhost:8000${movie_data[0].poster_img}')"></div>
            <div class="detail-hearder">${movie_data[0].title}</div>
            <div class="line"></div>
            <div class="detail-body">
                <div class="text-container">
                    <div class="body-header">Duration</div> 
                    <div class="body-detail">${movie_data[0].duration} min.</div>
                </div>
                <div class="text-container">
                    <div class="body-header">Genre</div> 
                    <div class="body-detail">${movie_data[0].genre}</div>
                </div>
                <div class="text-container">
                    <div class="body-header">Languages</div> 
                    <div class="body-detail">${movie_data[0].all_languages}</div>
                </div>
            </div>
            <div class='line'></div>
            <form class = 'date-choose-form'>
                <label>
                Choose Date:
                <input
                    type="date"
                    name="date"
                    min="${formattedDate}"
                    value="${formattedDate}"
                required />
                </label>
                <input type='submit'></input>

            </form>`

            const descriptionContainer = document.querySelector('.description-detail');
            descriptionContainer.innerHTML = `${movie_data[0].description}`;
            const form =document.querySelector('.date-choose-form');
            form.addEventListener('submit',async (event)=>{
                event.preventDefault();
                const target = event.target;
                const formData = new FormData(target);
                formattedDate = formData.get('date');
                console.log(formattedDate)
                await ConstructShowTimeBox();
                
            })
    }catch{
        alert ('No Showtimes.');
        window.location.href='Homepage.html'
    }
}

const ConstructShowTimeBox = async()=>{
  try{
    const result = await axios.get('http://localhost:8000/showtime', {
      params: {
      id: movieId,
      date: formattedDate
      }
    })
    const showtime = result.data;
    if(showtime.message){
      console.log(showtime.message);
    }else{
      console.log(showtime);
      const showtimeHeader= document.querySelector('.showtime-header');
      showtimeHeader.innerHTML=`ShowTime On : ${formattedDate}`;
      const showtimeList = document.querySelector('.showtime-list');
      showtimeList.innerHTML='';
      showtime.forEach(row => {
        let div = document.createElement('div');
        div.className = 'theater';
        div.innerHTML = `
            <div class="Thaeter-name">
                ${row.theater} :
            </div>
        `;
        let showtimeD = document.createElement('div');
        showtimeD.className = 'showtime-detail';
        row.show_info.forEach(data =>{
          let timeB = document.createElement('div');
          if(data.status == 'Curr'){
            timeB.className = 'time_button';
            timeB.addEventListener("click", () => gotoBooking(data.s_id));
          }else{
            timeB.className = 'past_time_button';
          }
          timeB.innerHTML=`${data.time} (${data.lan})`;
          showtimeD.appendChild(timeB);
        });
        div.appendChild(showtimeD);
        showtimeList.appendChild(div);
      });
    }
                    
    }catch(error){
      console.log('no data');
      const showtimeHeader= document.querySelector('.showtime-header');
      showtimeHeader.innerHTML=`ShowTime On : ${formattedDate}(No show time)`;
      const showtimeList = document.querySelector('.showtime-list');
      showtimeList.innerHTML='';
    }
};

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

const gotoBooking = async (id) =>{
  const response = await check_auth();
  console.log(response);
  if (response.auth === true) {
    console.log('User is authenticated:', response);
    window.location.href= `BookingPage.html?Sid=${id}&Mid=${movieId}`;
  } else {
    openOverlay('login-overlay');
  }
}

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


