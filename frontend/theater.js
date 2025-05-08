window.onload = async () => {
  const response = await check_auth();
  if(response.Role !=='admin'){
    alert('WHO ARE YOU?')
    window.location.href='HomePage.html';
  }
  await loadtable();
} 
    const modal = document.getElementById('addTheaterModal');
    const openBtn = document.getElementById('openAddModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('addTheaterForm');
    const table = document.getElementById('theaterTable');
    const submitBtn = document.getElementById('submitBtn');
    const modalTitle = document.getElementById('modalTitle');

    let editRow = null;

    /*Open overlay Add*/
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('theaterId').style.display = 'block';
      document.getElementById("theaterId").setAttribute("required", "true");
      document.getElementById('theaterId_label').style.display = 'block';
      form.reset();
      submitBtn.textContent = 'Add';
      modalTitle.textContent = 'Add Theater';
      modal.classList.add('show');
      
      editRow = null;
    });

    cancelBtn.addEventListener('click', () => {
      modal.classList.remove('show');
      form.reset();
    });


    /*Submit overlay form*/
    form.addEventListener('submit',async function (e) {
      e.preventDefault();
      
      const form = e.target;
      const formData = new FormData(form);
      const innerContent = submitBtn.textContent.trim();
      if(innerContent === 'Add'){
        try {
          const response = await axios.post('http://localhost:8000/theater', formData);
          alert("Theater added successfully!");
          modal.classList.remove('show');
          form.reset(); // Clear form after success
          window.location.reload();
        } catch (error) {
          console.error("Submission error:", error);
          alert("Failed to add theater.");
        }
      }else{
        formData.append("id", editRow);
        try{
          const response = await axios.put('http://localhost:8000/theater', formData);
          if(response.data.success){
            console.log("theater updated successfully:", response.data);
  			    alert("theater updated successfully!");
            window.location.reload()
          }else{
            alert("Failed to update theater.");
          }
        }catch{
          console.error("Submission error:", error);
  				alert("Failed to update rheater.");
        }
        
      }
    });

const loadtable = async () => {
  try {
    const response = await axios.get('http://localhost:8000/theater');
    const data = response.data;
    console.log(data);

    const tbody = document.querySelector('#theaterTable');
    tbody.innerHTML = '';

    for (let i = 0; i < data.length; i++) {
      const theater = data[i];
      const tr = document.createElement('tr');
      tr.id = theater.theater_id;

      tr.innerHTML = `
        <td data-name="theater_id">${theater.theater_id}</td>
        <td data-name="theater_name">${theater.tname}</td>
        <td data-name="row">${theater.row_seat}</td>
        <td data-name="col">${theater.column_seat}</td>
        <td>
          <button class="edit-btn" data-id="${theater.theater_id}" onclick="edit(this.dataset.id)">
            <i class='bx bxs-edit'></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    }
  } catch (error) {
    console.error('Error loading theaters:', error.message);
  }
};


function edit(id) {
  console.log('Edit theater ID:', id);
  const tr = document.getElementById(id);
  if (!tr) return;

  document.getElementById('theaterName').value = tr.querySelector('[data-name="theater_name"]').textContent;
  document.getElementById('rows').value = tr.querySelector('[data-name="row"]').textContent;
  document.getElementById('columns').value = tr.querySelector('[data-name="col"]').textContent;

  editRow = id;

  document.getElementById('theaterId').style.display = 'none';
  document.getElementById("theaterId").removeAttribute("required");
  document.getElementById('theaterId_label').style.display = 'none';

  submitBtn.textContent = 'Save';
  modalTitle.textContent = 'Edit Theater';
  modal.classList.add('show');
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
