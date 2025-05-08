const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('Mid');
const show_id = urlParams.get('Sid');
let choosen_seat =[];

window.onload = async () => {
  await loadData();
  await ConstructDetailBox();
  await ConstructBooking();
  await loadProfileimg();
}

const loadData = async () => {
    console.log(movieId);
};

const ConstructDetailBox = async () => {
    try{
        const response = await axios.get(`http://localhost:8000/Choose_th?id=${movieId}`);
        const movie_data = response.data;
        const container = document.querySelector('.movie-detail-container');
        console.log(movie_data[0].title);
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
            </div>`
    }catch{
        alert ('Something Error');
        window.location.href='Homepage.html'
    }
}

const ConstructBooking = async () => {
    try {
        const response = await axios.get(`http://localhost:8000/seat_status?id=${show_id}`);
        const seatdata = response.data;
        console.log(seatdata)
        if (seatdata.length === 0) {
            alert("Something went wrong!!");
            window.location.href = `choose_th.html?id=${movieId}`;
            return;
        }

        const seatContainer = document.querySelector('.seat');
        const rows = seatdata[0].row_seat;
        const cols = seatdata[0].column_seat;
        seatContainer.innerHTML ='';
        for (let i = rows; i > 0; i--) {
            let rowDiv = document.createElement('div');
            rowDiv.className = 'seat-row';

            let rowLabelStart = document.createElement('div');
            rowLabelStart.className = 'row-lable';
            rowLabelStart.textContent = String.fromCharCode(64 + i);
            rowDiv.appendChild(rowLabelStart);

            for (let j = 1; j <= cols; j++) {
                const index = (rows - i) * cols + (cols - j);
                const seat = seatdata[index];
                let span = document.createElement('span');
                span.classList.add('seat-icon');
                span.id = seat.seat_label;

                if (['pending', 'confirmed'].includes(seat.booking_status)) {
                    span.classList.add('material-icons-outlined', 'already-choose');
                    span.textContent = 'account_circle';
                } else if (seat.seat_type === 'Normal') {
                    span.classList.add('material-icons','empty-seat');
                    span.setAttribute('data-price', '240');
                    span.addEventListener("click",() => choose_seat(seat.seat_label,span,seat.seat_id));
                    span.textContent = 'event_seat';
                } else if (seat.seat_type === 'Premium') {
                    span.classList.add('material-icons','empty-seat');
                    span.setAttribute('data-price', '270');
                    span.addEventListener("click",() => choose_seat(seat.seat_label,span,seat.seat_id));
                    span.textContent = 'chair';
                } else {
                    span.classList.add('material-icons', 'unknown-seat');
                    span.setAttribute('data-price', '270');
                    span.textContent = 'help_outline';
                }
                rowDiv.appendChild(span);
        }

            let rowLabelEnd = document.createElement('div');
            rowLabelEnd.className = 'row-lable';
            rowDiv.appendChild(rowLabelEnd);

            seatContainer.appendChild(rowDiv);
        }
        let rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';

        let rowLabelStart = document.createElement('div');
        rowLabelStart.className = 'row-lable';
        rowDiv.appendChild(rowLabelStart);
        for (let j = 1; j <= cols; j++) {
            let col_la = document.createElement('div');
            col_la.classList.add('row-lable');
            col_la.innerHTML=j;
            rowDiv.appendChild(col_la);
        }
        let rowLabelEnd = document.createElement('div');
        rowLabelEnd.className = 'row-lable';
        rowDiv.appendChild(rowLabelEnd);

        seatContainer.appendChild(rowDiv);
        

    } catch (error) {
        console.error("Error fetching seat status:", error);
        alert("Failed to fetch seat data.");
        //window.location.href = `choose_th.html?id=${movieId}`;
    }
}

function gobacktochooseTH(){
    window.location.href = `Choose_th.html?id=${movieId}`;
}

function choose_seat(id, el, sid) {
    // Prevent selecting more than 28 seats
    console.log('id',id);
    if (choosen_seat.length >= 28 && el.textContent !== 'check_circle') {
        alert('You have reached the maximum seat limit (28 seats).');
        return;
    }

    // Get the price of the seat (stored in the 'data-price' attribute)
    const pricePerSeat = parseInt(el.getAttribute('data-price')) || 0;

    // Handle seat selection and deselection
    if (el.textContent === 'event_seat' || el.textContent === 'chair') {
        choosen_seat.push({ label: id, price: pricePerSeat, id:sid });  // Add selected seat with price to array
        el.textContent = 'check_circle';  // Change icon to indicate selection
    } else {
        // If the seat is already selected, remove it from the array
        const index = choosen_seat.findIndex(seat => seat.label === id);
        if (index > -1) {
            choosen_seat.splice(index, 1);  // Remove the seat from the array
        }
        el.textContent = 'event_seat';  // Change icon back to original state
    }

    // Toggle the selected-seat-icon class for visual indication
    el.classList.toggle('selected-seat-icon');
    
    // Update the selected seats display and calculate the total price
    const selectedbodyseat = document.querySelector('.selected-body');
    const price = document.querySelector('.Total-body');
    
    if (choosen_seat.length <= 0) {
        selectedbodyseat.innerHTML = '-';  // Show '-' if no seats are selected
        price.innerHTML = '-';  // Show '-' for price if no seats are selected
    } else {
        // Display the selected seat IDs
        selectedbodyseat.innerHTML = choosen_seat.map(seat => seat.label).join(', ');

        // Calculate the total price
        const totalPrice = choosen_seat.reduce((total, seat) => total + seat.price, 0);
        price.innerHTML = `${totalPrice} Baht`;  // Show the total price with currency
    }
}

function createPaymentIntent(allbooingIds) {
  const stripe = Stripe('pk_test_51RK8GhRrElyhlQqFTdBCAr749lBD3K73IjKeNiTkTddSAIi0yTpqYql3chqpMel3raCS7uzbUBc7qHknMTkE6cZ3008XSUS8YI');
  const elements = stripe.elements();

  const style = {
    base: {
      color: '#32325d',
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      '::placeholder': {
        color: '#a0aec0'
      }
    },
    invalid: {
      color: '#e53e3e'
    }
  };

  const cardNumber = elements.create('cardNumber', { style });
  const cardExpiry = elements.create('cardExpiry', { style });
  const cardCvc = elements.create('cardCvc', { style });

  cardNumber.mount('#card-number');
  cardExpiry.mount('#card-expiry');
  cardCvc.mount('#card-cvc');

  const form = document.getElementById('payment-form');
  const message = document.getElementById('payment-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const totalPrice = choosen_seat.reduce((total, seat) => total + seat.price, 0);
    const response = await fetch('http://localhost:8000/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: totalPrice*100, currency: 'thb' ,bookingIds: allbooingIds }) // $50
    });

    const data = await response.json();

    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card: cardNumber
      }
    });

    if (result.error) {
      message.textContent = result.error.message;
    } else if (result.paymentIntent.status === 'succeeded') {
      message.textContent = 'Payment successful!';
      openOverlay('finish');
    }
  });
};

function openOverlay(id){
  const overlayALL = document.querySelectorAll('#overlay');
  overlayALL.forEach(item =>{
    item.style.display='none';
  });
  overlay = document.querySelector('.'+id);
  console.log(id);
  overlay.style.display = 'flex';
}

function closeOverlay(e){
  console.log(e);
  if (e.target === overlay) {
        overlay.style.display = 'none';
      }
}
function colseOverlayBybutton(el){
  el.style.display ='none';
}

function checkTopay(){
    if(choosen_seat.length>0){
        openOverlay('OrderSum');
        const seat_list = document.querySelector('.seat_list_container');
        const total_amount = document.querySelector('.Total_amount_container');
        const totalPrice = choosen_seat.reduce((total, seat) => total + seat.price, 0);
        seat_list.innerHTML = choosen_seat.map(seat => seat.label).join(', ');
        total_amount.innerHTML = `${totalPrice} Baht`; 
    }else{
        alert('you need to select seat first.');
    }
    
}

async function confirm_order() {
    const allIds = choosen_seat.map(seat => seat.id);
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Please login first');
        window.location.href = `Choose_th.html?id=${movieId}`;
        return;
    }

    try {
        const result = await axios.post(
            'http://localhost:8000/Booking_confirm',
            {
                show_id,
                seat_id: allIds
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!result.data.success) {
            throw new Error('Please try again.');
        } else {
            createPaymentIntent(result.data.booking_id);
            openOverlay('Payment');
        }
    } catch (error) {
        alert(error.message || 'Something went wrong.');
        window.location.reload();
    }
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
    return response.data;
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem('token');
    return { auth: false };
  }
};

const loadProfileimg = async()=>{
  const response = await check_auth();
  if(response.auth=== true){
    const profile_img = document.getElementById('Profile_img')
    console.log('profile',response.profile_img);
    profile_img.src = response.profile_img ? `http://localhost:8000${response.profile_img}` : 'http://localhost:8000/img/userProfile/Default.png';
  }else{
    window.location.href='Homepage.html';
  }
}