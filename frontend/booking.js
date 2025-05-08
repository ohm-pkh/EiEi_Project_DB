window.onload = async () => {
  const response = await check_auth();
  if(response.Role !=='admin'){
    alert('WHO ARE YOU?')
    window.location.href='HomePage.html';
  }
  await loadtable();
}

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
    console.log
    return response.data;
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem('token');
    return { auth: false };
  }
};

const loadtable = async () => {
  try {
    const response = await axios.get('http://localhost:8000/booking');
    const data = response.data;
    console.log(data);

    const tbody = document.querySelector('#bookingTable tbody');
    tbody.innerHTML = '';

    for (let i = 0; i < data.length; i++) {
      const booking = data[i];
      const tr = document.createElement('tr');
      tr.setAttribute('data-status', booking.booking_status);

      tr.innerHTML = `
        <td>${booking.booking_id}</td>
        <td>${booking.user_id}</td>
        <td>${booking.show_id}</td>
        <td>${booking.seat_label}</td>
        <td>${booking.booking_status}</td>
        <td>${booking.bookingdate}</td>
      `;

      tbody.appendChild(tr);
    }

  } catch (error) {
    console.error('Error loading users:', error.message);
  }
};

// Sidebar highlight
  const sideLinks = document.querySelectorAll('#sidebar .side-menu.top li a');
  sideLinks.forEach(link => {
    if (window.location.href.includes(link.getAttribute('href'))) {
      link.parentElement.classList.add('active');
    } else {
      link.parentElement.classList.remove('active');
    }
  });

  // Filter
  const statusFilter = document.getElementById('statusFilter');
  statusFilter.addEventListener('change', () => {
  const selected = statusFilter.value.toLowerCase();
  const rows = document.querySelectorAll('#bookingTable tbody tr');

  rows.forEach(row => {
    const status = row.getAttribute('data-status').toLowerCase();
    row.style.display = selected === 'all' || status === selected ? '' : 'none';
  });
});
