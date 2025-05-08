
window.onload = async () => {
  const response = await check_auth();
  if(response.Role !=='admin'){
    alert('WHO ARE YOU?')
    window.location.href='HomePage.html';
  }
  await loadtable();
}

// ===== Sidebar Active Highlight =====
const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');

allSideMenu.forEach(item => {
	const li = item.parentElement;
	item.addEventListener('click', () => {
		allSideMenu.forEach(i => i.parentElement.classList.remove('active'));
		li.classList.add('active');
	});
});

// ===== Sidebar Toggle =====
const menuBar = document.querySelector('#content nav .bx.bx-menu');
const sidebar = document.getElementById('sidebar');

if (menuBar) {
	menuBar.addEventListener('click', () => {
		sidebar.classList.toggle('hide');
	});
}


// ===== Dark Mode =====
const switchMode = document.getElementById('switch-mode');
switchMode.addEventListener('change', () => {
	document.body.classList.toggle('dark', switchMode.checked);
});

// ===== Responsive Search Toggle =====
const searchForm = document.querySelector('#content nav form');
const searchButton = searchForm.querySelector('button');
const searchButtonIcon = searchForm.querySelector('.bx');
searchButton.addEventListener('click', (e) => {
	if (window.innerWidth < 576) {
		e.preventDefault();
		searchForm.classList.toggle('show');
		searchButtonIcon.classList.toggle('bx-search');
		searchButtonIcon.classList.toggle('bx-x');
	}
});
window.addEventListener('resize', () => {
	if (window.innerWidth > 576) {
		searchButtonIcon.classList.replace('bx-x', 'bx-search');
		searchForm.classList.remove('show');
	}
});

// ===== Sidebar Menu Filter =====
const searchInput = document.getElementById('menuSearch');
const menuItems = document.querySelectorAll('#sidebar .side-menu.top li');
searchInput.addEventListener('input', function () {
	const query = this.value.toLowerCase();
	menuItems.forEach(item => {
		const text = item.innerText.toLowerCase();
		item.style.display = text.includes(query) ? '' : 'none';
	});
});

// ===== Modal & Form Logic =====
const openBtn = document.getElementById('openAddModal');
const modal = document.getElementById('addMovieModal');
const cancelBtn = document.getElementById('cancelBtn');
const form = document.getElementById('addMovieForm');
const posterInput = document.getElementById('poster');
const tableBody = document.querySelector('table tbody');
const submitBtn = document.getElementById('submitBtn');
const modalTitle = document.getElementById('modalTitle');

let editRow = null;

// ===== Open Modal (Add) =====
openBtn.addEventListener('click', (e) => {
	e.preventDefault();
	document.getElementById('poster').style.display='block';
	document.getElementById("poster").setAttribute("required", "true");
  	document.getElementById('other_img').style.display='block';
	document.getElementById("other_img").setAttribute("required", "true");
  	document.getElementById('poster_label').style.display='block';
  	document.getElementById('other_label').style.display='block';
	submitBtn.textContent = 'Add';
	modalTitle.textContent = 'Add Movie';
	modal.classList.add('show');
	form.reset();
});

// ===== Close Modal =====
cancelBtn.addEventListener('click', () => {
	modal.classList.remove('show');
	form.reset();
	submitBtn.textContent = 'Add';
	modalTitle.textContent = 'Add Movie';
	editRow = null;
});

// ===== Show Poster Preview =====
posterInput.addEventListener('change', function () {
	const file = this.files[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = function (e) {
			posterPreview.src = e.target.result;
			posterPreview.style.display = 'block';
		};
		reader.readAsDataURL(file);
	}
});



document.getElementById("addMovieForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
	const innerContent = submitBtn.textContent.trim();
	if(innerContent === 'Add'){
		try {
      const response = await axios.post('http://localhost:8000/movie', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert("Movie added successfully!");
      form.reset(); // Clear form after success
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to add movie.");
    }
	}else{
		formData.append("id", editRow);
		try {
  			const response = await axios.put('http://localhost:8000/movie', formData);
        if(response.data.success){
          console.log("Movie updated successfully:", response.data);
  			  alert("Movie updated successfully!");
          window.location.reload()
        }else{
          alert("Failed to update movie.");
        }
  			
			} catch (error) {
  				console.error("Submission error:", error);
  				alert("Failed to update movie.");
			}
	}

    
  });

document.getElementById("cancelBtn").addEventListener("click", () => {
    document.getElementById("addMovieForm").reset();
});


// ===== Edit Movie Button =====
function edit(id) {
  const tr = document.getElementById(`${id}`);
  document.getElementById('title').value = tr.querySelector('[data-name="title"]').textContent;
  document.getElementById('genre').value = tr.querySelector('[data-name="genre"]').textContent;
  document.getElementById('releaseDate').value = tr.querySelector('[data-name="releaseDate"]').textContent;
  document.getElementById('endedDate').value = tr.querySelector('[data-name="releaseDate"]').getAttribute('end');
  document.getElementById('duration').value = tr.querySelector('[data-name="duration"]').textContent;
  document.getElementById('description').value = tr.querySelector('[data-name="description"]').textContent;
  editRow = id
  document.getElementById('poster').style.display='none';
  document.getElementById("poster").removeAttribute("required");
  document.getElementById('other_img').style.display='none';
  document.getElementById("other_img").removeAttribute("required");
  document.getElementById('poster_label').style.display='none';
  document.getElementById('other_label').style.display='none';
  submitBtn.textContent = 'Save';
  modalTitle.textContent = 'Edit Movie';
  modal.classList.add('show');
}



// ===== Delete Movie Button =====
const rm = async (id) => {
  console.log('Movie ID:', id);  // This will help debug if the ID is passed correctly
  try {
    const response = await axios.delete(`http://localhost:8000/movie`, {
      params: { id }
    });
    console.log('Response:', response.data);
    alert('Movie deleted successfully!');
  } catch (error) {
    console.error('Delete error:', error);
    alert('Failed to delete movie.');
  }
  window.location.reload();
};


const loadtable = async () => {
  try {
    const response = await axios.get('http://localhost:8000/movie');
	const data = response.data;
    const tbody = document.querySelector('.mov_m_container');
	tbody.innerHTML=``;

for (let i = 0; i < data.length; i++) {
  const movie = data[i];
  const tr = document.createElement('tr');
  tr.id = movie.movie_id;

  const now = new Date();
  const releaseDate = new Date(movie.release_date);
  const endedDate = new Date(movie.endededdate);

  let statusText = '';
  if (endedDate < now) {
    statusText = 'Ended';
  } else if (releaseDate > now) {
    statusText = 'Upcoming';
  } else {
    statusText = 'Now Playing';
  }

  tr.innerHTML = `
    <td><img src="http://localhost:8000${movie.poster_img}" alt="poster" style="width: 40px;" /></td>
    <td data-name="movieId">${movie.movie_id}</td>
    <td data-name="title">${movie.title}</td>
    <td data-name="genre">${movie.genre}</td>
    <td data-name="releaseDate" end='${movie.endeddate.split('T')[0]}'>${movie.release_date.split('T')[0]}</td>
    <td data-name="duration">${movie.duration}</td>
    <td data-name="status"><span class="status completed">${statusText}</span></td>
    <td data-name="description">${movie.description}</td>
    <td>
      <button class="edit-btn" onclick='edit(${movie.movie_id})'><i class='bx bxs-edit'></i></button>
      <button class="delete-btn" onclick='rm(${movie.movie_id})'><i class='bx bxs-trash'></i></button>
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
