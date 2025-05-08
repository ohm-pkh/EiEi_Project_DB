window.onload = async () => {
  const response = await check_auth();
  if(response.Role !=='admin'){
    alert('WHO ARE YOU?')
    window.location.href='HomePage.html';
  }
  await loadtable();
}

const modal = document.getElementById('addScheduleModal');
const openBtn = document.getElementById('openAddModal');
const cancelBtn = document.getElementById('cancelBtn');
const form = document.getElementById('addScheduleForm');
const table = document.getElementById('scheduleTable');
const submitBtn = document.querySelector('#addScheduleForm .add-btn');
const modalTitle = document.getElementById('modalTitle');

let editRow = null;

// === Open Modal for Add ===
openBtn.addEventListener('click', (e) => {
  e.preventDefault();
  modal.classList.add('show');
  form.reset();
  submitBtn.textContent = 'Add';
  modalTitle.textContent = 'Add Schedule';
  editRow = null;
});

// === Cancel Button ===
cancelBtn.addEventListener('click', () => {
  modal.classList.remove('show');
  form.reset();
  editRow = null;
  submitBtn.textContent = 'Add';
  modalTitle.textContent = 'Add Schedule';
});

// === Submit Form (Add or Save) ===
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const form = e.target;
    const formData = new FormData(form);
	const innerContent = submitBtn.textContent.trim();
	if(innerContent === 'Add'){
		try {
      const response = await axios.post('http://localhost:8000/schedule', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert("Schedule added successfully\n");
      form.reset(); // Clear form after success
      window.location.reload();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to add Schedule.");
    }
	}else{
    formData.append("id", editRow);
		try {
  			const response = await axios.put('http://localhost:8000/schedule', formData);
        if(response.data.success){
          console.log("Schedule updated successfully:", response.data);
  			  alert("Schedule updated successfully!");
          window.location.reload()
        }else{
          alert("Failed to update schedule.");
        }
  			
			} catch (error) {
  				console.error("Submission error:", error);
  				alert("Failed to update schedule.");
			}
	}

  modal.classList.remove('show');
  form.reset();
});


function edit(id) {
  const tr = document.getElementById(`${id}`);
  document.getElementById('movie_id').value = tr.querySelector('[data-name="title"]').getAttribute('mid');
  document.getElementById('scheduleDate').value = ((d => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`)(new Date(tr.querySelector('[data-name="date"]').textContent)));
  document.getElementById('scheduleTime').value = tr.querySelector('[data-name="time"]').textContent;
  document.getElementById('theater').value = tr.querySelector('[data-name="tname"]').getAttribute('tid');
  document.getElementById('language').value = tr.querySelector('[data-name="language"]').textContent;
  editRow = id
  submitBtn.textContent = 'Save';
  modalTitle.textContent = 'Edit Schedule';
  modal.classList.add('show');
}

const rm = async (id) => {
  console.log('Movie ID:', id);  // This will help debug if the ID is passed correctly
  try {
    const response = await axios.delete(`http://localhost:8000/schedule`, {
      params: { id }
    });
    console.log('Response:', response.data);
    alert('schedule deleted successfully!');
  } catch (error) {
    console.error('Delete error:', error);
    alert('Failed to delete movie.');
  }
  window.location.reload();
};

const loadtable = async () => {
  try {
    const response = await axios.get('http://localhost:8000/schedule');
	const data = response.data;
    console.log(data);
    const tbody = document.querySelector('#scheduleTable');
	tbody.innerHTML=``;
for (let i = 0; i < data.length; i++) {
  const showtime = data[i];
  const tr = document.createElement('tr');
  tr.id = showtime.show_id;

  tr.innerHTML = `
    <td>${showtime.show_id}</td>
      <td data-name="title" mid="${showtime.movie_id}">${showtime.title}</td>
      <td data-name="date">${showtime.date}</td>
      <td data-name="time">${showtime.time}</td>
      <td data-name="tname" tid="${showtime.theater_id}">${showtime.tname}</td>
      <td data-name="language">${showtime.language}</td>
      <td>
        <button class="edit-btn" onclick='edit(${showtime.show_id})'><i class='bx bxs-edit'></i></button>
        <button class="delete-btn" onclick='rm(${showtime.show_id})'><i class='bx bxs-trash'></i></button>
    </td>
  `;

  tbody.appendChild(tr);
}

  } catch (error) {
    console.error('Error loading movies:', error.message);
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
