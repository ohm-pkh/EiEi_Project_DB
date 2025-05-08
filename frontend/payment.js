window.onload = async () => {
  const response = await check_auth();
  if(response.Role !=='admin'){
    alert('WHO ARE YOU?')
    window.location.href='HomePage.html';
  }
  await loadMethod();
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

const loadMethod = async ()=>{
    try{
        const response = await axios.get('http://localhost:8000/paymentMethodCount');
        console.log(response.data);
        const filter_container = document.getElementById('methodFilter');
        response.data.forEach(row => {
            const option = document.createElement('option');
            option.value = row.payment_method;
            option.textContent = `${row.payment_method}`;
            filter_container.appendChild(option);
            });
    }catch{
        console.error('Error loading payments:', error.message);
    }
}


const loadtable = async () => {
  try {
    const response = await axios.get('http://localhost:8000/payment');
    const data = response.data;
    console.log(data);

    const tbody = document.querySelector('#paymentTableBody');
    tbody.innerHTML = '';

    for (let payment of data) {
      const tr = document.createElement('tr');

      // Replace all nulls with '-'
      const cleaned = {};
      for (let key in payment) {
        cleaned[key] = payment[key] === null ? '-' : payment[key];
      }
      let status;
      if(cleaned.status ==='confirmed'){
        status = 'Paid';
      }else{
        status = 'Unpaid';
      }

      tr.innerHTML = `
        <td>${cleaned.payment_id}</td>
        <td>${cleaned.booking_id}</td>
        <td>${cleaned.user_id}</td>
        <td>${cleaned.title}</td>
        <td>${cleaned.payment_method}</td>
        <td>${cleaned.amount}</td>
        <td><span class="status ${status.toLowerCase()}">${status}</span></td>
      `;

      tbody.appendChild(tr);
    }
  } catch (error) {
    console.error('Error loading payments:', error.message);
  }
};



// Sidebar highlight logic
  const sideLinks = document.querySelectorAll('#sidebar .side-menu.top li a');
  sideLinks.forEach(link => {
    if (window.location.href.includes(link.getAttribute('href'))) {
      link.parentElement.classList.add('active');
    } else {
      link.parentElement.classList.remove('active');
    }
  });

  const statusFilter = document.getElementById('statusFilter');
  const methodFilter = document.getElementById('methodFilter');

  function applyFilters() {
    const selectedStatus = statusFilter.value;
    const selectedMethod = methodFilter.value;
    const rows = document.querySelectorAll('#paymentTable tbody tr');

    rows.forEach(row => {
      const methodText = row.cells[4].textContent;
      const isPaid = row.querySelector('.status')?.classList.contains('paid');
      const statusText = isPaid ? 'paid' : 'unpaid';

      const matchStatus = selectedStatus === 'all' || selectedStatus === statusText;
      const matchMethod = selectedMethod === 'all' || selectedMethod === methodText;

      row.style.display = matchStatus && matchMethod ? '' : 'none';
    });
  }

  statusFilter.addEventListener('change', applyFilters);
  methodFilter.addEventListener('change', applyFilters);