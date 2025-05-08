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
    return response.data;
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem('token');
    return { auth: false };
  }
};

const loadtable = async () => {
  try {
    const response = await axios.get('http://localhost:8000/user');
    const data = response.data;
    console.log(data);

    const tbody = document.querySelector('#userTable');
    tbody.innerHTML = '';

    for (let i = 0; i < data.length; i++) {
      const user = data[i];
      const tr = document.createElement('tr');
      tr.id = user.user_id;

      tr.innerHTML = `
        <td><img src="http://localhost:8000${user.profile}" style="width:40px;" /></td>
        <td>${user.username}</td>
        <td>${user.fname}</td>
        <td>${user.gender}</td>
        <td>${user.email}</td>
        <td>${user.join_date}</td>
        <td>
            <button class="delete-btn" onclick='rm(${user.user_id})'><i class='bx bxs-trash'></i></button>
        </td>
      `;

      tbody.appendChild(tr);
    }

  } catch (error) {
    console.error('Error loading users:', error.message);
  }
};

const rm = async (id) => {
  console.log('Movie ID:', id);  // This will help debug if the ID is passed correctly
  try {
    const response = await axios.delete(`http://localhost:8000/user`, {
      params: { id }
    });
    console.log('Response:', response.data);
    alert(`User ID ${id} deleted successfully!`);
  } catch (error) {
    console.error('Delete error:', error);
    alert('Failed to delete movie.');
  }
  window.location.reload();
};


/*
  const table = document.getElementById('userTable');
  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${user.avatar}" style="width:40px; border-radius:50%;" /></td>
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.phone}</td>
      <td>${user.joined}</td>
      <td>
        
        <button class="delete-btn"><i class='bx bxs-trash'></i></button>
      </td>
    `;
    table.appendChild(row);
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.delete-btn')) {
      const row = e.target.closest('tr');
      const name = row.querySelectorAll('td')[2]?.textContent || 'this user';
      if (confirm(`Are you sure you want to delete "${name}"?`)) {
        row.remove();
      }
    }
  });*/
