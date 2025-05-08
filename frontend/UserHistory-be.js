window.onload = async () => {
  await ConstructHistory();
}

const ConstructHistory = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Something went wrong');
    window.location.href = 'Homepage.html';
    return;
  }

  try {
    const response = await axios.get('http://localhost:8000/userHistory', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const container = document.querySelector('.history-container-scoller'); // Corrected selector
    if (!container) {
      console.error('Container not found');
      return;
    }

    if (response.data.length > 0) {
      const data = response.data;

      for (let i = data.length - 1; i >= 0; i--) {
        const item = data[i];

        const card = document.createElement('div');
        card.classList.add('history-container');

        card.innerHTML = `
          <div class="movie-photo" style = "background-image:url('http://localhost:8000${item.poster_img}')">
            <!-- Optional: Insert an <img> if movie image URL is available -->
          </div>
          <div class="title">
            ${item.title}
          </div>
          <div class="movie-info">
            <div class="theater_name">
              ${item.tname}
            </div>
            <div class="date_time">
              <div class="date">
                <span class="material-icons-outlined date_icon">calendar_month</span>
                <span>${item.date}</span>
              </div>
              <div class="time">
                <span class="material-icons-outlined date_icon">slow_motion_video</span>
                <span>${item.time}</span>
              </div>
            </div>
            <div class="seat-no">
              Seat No. <span class="seat-label">${item.seat_label}</span>
            </div>
            <div class="status ${item.booking_status === 'confirmed' ? 'confirm' : 'pending'}">
              ${item.booking_status}
            </div>
          </div>
        `;

        container.appendChild(card);
      }
    } else {
      console.log('No booking history');
    }

  } catch (error) {
    console.log("Something went wrong.", error);
  }
};
