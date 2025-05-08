
window.onload = async () => {
  const response = await check_auth();
  if(response.Role !=='admin'){
    alert('WHO ARE YOU?')
    window.location.href='HomePage.html';
  }
  await loadBar ();
  await loadRegisterData();
  await loadShowTime();
  await loadMethod();
  await loadTopSell();
}

const loadBar = async () => {
  try {
    const response = await axios.get('http://localhost:8000/DAY_BUY');
    console.log(response.data);

    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const countsByDay = {};

    // Clean up day_abbr and build a lookup
    response.data.forEach(item => {
      const day = item.day_abbr.trim(); // Remove spaces like 'Mon '
      countsByDay[day] = parseInt(item.count);
    });

    const day_data = dayOrder.map(day => countsByDay[day] || 0);

    const ctx = document.getElementById('ticketChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dayOrder,
        datasets: [{
          label: 'Tickets',
          data: day_data,
          backgroundColor: '#ECCCFF',
          borderRadius: 6,
          barThickness: 45
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: '#eee' },
            beginAtZero: true,
            ticks: { font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });

    const res = await axios.get('http://localhost:8000/month_sum');
    const today_sum = document.getElementById('today_count');
    const week_sum = document.getElementById('week_count');
    const month_sum = document.getElementById('month_count');
    today_sum.innerText = res.data[0].today_count;
    week_sum.innerText = res.data[0].this_week_count;
    month_sum.innerText = res.data[0].this_month_count;

  } catch (error) {
    console.error('Failed to load data for chart:', error);
  }
};

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

const loadRegisterData = async () => {
    try{
        const res = await axios.get('http://localhost:8000/register');
const result = res.data;

const New_user = document.querySelector('#New_user strong');
const Total_user = document.getElementById('Total_user');

New_user.textContent = result[0].joined_last_30_days;
Total_user.textContent = result[0].total_users;

    }catch{
        console.log('Something went wrong.');
    }
    
}

const loadShowTime = async () =>{
  try{
      const res = await axios.get('http://localhost:8000/showTimeCount');
      const result = res.data;
      document.querySelector('.totalShowtime').innerText = result[0].total;
      document.querySelector('.upcomingShowtime strong').innerText = result[0].upcoming;
      document.querySelector('.nextShowtime strong').innerText = result[0].nextcomming;
      document.querySelector('.pastShowtime strong').innerText = result[0].past;
    }catch{
        console.log('Something went wrong.');
    }
}


const loadMethod = async () => {
  try {
    const res = await axios.get('http://localhost:8000/paymentMethodCount');
    const result = res.data;

    const labels = result.map(item => item.payment_method || 'Unknown');
    const data = result.map(item => parseInt(item.count, 10));
    const backgroundColors = ['#FFD27C', '#FF9C9C', '#80E0E5', '#A0D8B3', '#C9B1FD'];

    // Draw chart
    const paymentCtx = document.getElementById('paymentChart').getContext('2d');
    new Chart(paymentCtx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Disable built-in legend
          }
        }
      }
    });

    // Generate custom legend
    const legendContainer = document.getElementById('paymentLegend');
    legendContainer.innerHTML = ''; // Clear existing legend

    labels.forEach((label, index) => {
      const color = backgroundColors[index];
      const legendItem = document.createElement('div');
      legendItem.style.display = 'flex';
      legendItem.style.alignItems = 'center';
      legendItem.innerHTML = `
        <span style="background:${color}; border-radius:3px; width: 12px; height: 12px; display:inline-block; margin-right: 6px;"></span>
        <span>${label}</span>
      `;
      legendContainer.appendChild(legendItem);
    });

  } catch (err) {
    console.error('Error getting payment count.', err);
  }
};

const loadTopSell = async () => {
  try {
    const res = await axios.get('http://localhost:8000/TopSell');
    console.log(res.data);
    const row = res.data;
    const tbody = document.getElementById('Top_sell_table');
    
    for (let i = 0; i < row.length; i++) {
      const revenue = row[i].revenue ? row[i].revenue : '0'; // Ensure revenue is displayed as '0' if not available
      tbody.innerHTML += `
        <tr>
          <td style="padding: 4px 2px;">${i + 1}</td> <!-- Use i + 1 to start from 1 -->
          <td style="padding: 4px 2px;">${row[i].title}</td>
          <td style="padding: 4px 2px; text-align:center">${row[i].tickets}</td>
          <td style="padding: 4px 2px; text-align:end;">${revenue} THB</td>
        </tr>
      `;
    }
  } catch (err) {
    console.error('Error getting top sell:', err); // Make sure to log the error correctly
  }
};





/*
const paymentCtx = document.getElementById('paymentChart').getContext('2d');
  new Chart(paymentCtx, {
    type: 'pie',
    data: {
      labels: ['Credit/Debit', 'KBank', 'PromptPay'],
      datasets: [{
        data: [5, 3, 10],
        backgroundColor: ['#FFD27C', '#FF9C9C', '#80E0E5'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });*/