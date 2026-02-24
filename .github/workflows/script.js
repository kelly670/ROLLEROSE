/*
 * CONSOLIDATED SCRIPT FOR ROSE $ ROLLE
 * Combines all JavaScript functionality from multiple modules
 */

// ============= INDEX PAGE (app.js) =============
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
  }

  // Category page functionality
  const urlParams = new URLSearchParams(window.location.search);
  const cat = urlParams.get('cat');
  
  if (cat && document.getElementById('category-title')) {
    document.getElementById('category-title').textContent = cat;

    fetch(`/api/items/category/${encodeURIComponent(cat)}`)
      .then(response => response.json())
      .then(items => {
        const container = document.getElementById('items');
        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'item';
          div.innerHTML = `
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <p>Price: KES ${item.price}</p>
            <img src="${item.image}" alt="${item.name}">
            <a href="tel:+254721338398" class="call-btn">Call to Inquire</a>
          `;
          container.appendChild(div);
        });
      });
  }

  // Contact form functionality
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const message = document.getElementById('message').value;
      
      try {
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, subject: 'Contact Form Inquiry', message })
        });
        
        if (response.ok) {
          alert('Thank you! Your message has been sent. We will get back to you soon.');
          contactForm.reset();
        } else {
          alert('Error sending message. Please try again.');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error sending message. Please try again.');
      }
    });
  }

  // Testimonials page functionality
  const form = document.getElementById('testimonial-form');
  const testimonialsDiv = document.getElementById('testimonials');

  if (form && testimonialsDiv) {
    loadTestimonials();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const comment = document.getElementById('comment').value;
      const rating = document.getElementById('rating').value;

      fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: comment, rating })
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          return response.json().then(err => { throw new Error(err.error || 'Failed to submit testimonial'); });
        }
      })
      .then(() => {
        alert('Thank you for your testimonial!');
        form.reset();
        loadTestimonials();
      })
      .catch(err => {
        alert('Error: ' + err.message);
      });
    });

    function loadTestimonials() {
      fetch('/api/testimonials')
        .then(response => response.json())
        .then(testimonials => {
          testimonialsDiv.innerHTML = '';
          testimonials.forEach(testimonial => {
            const div = document.createElement('div');
            div.className = 'testimonial';
            const stars = '★'.repeat(testimonial.rating) + '☆'.repeat(5 - testimonial.rating);
            div.innerHTML = `
              <h4>${testimonial.name}</h4>
              <p>${testimonial.message}</p>
              <p class="rating">${stars}</p>
            `;
            testimonialsDiv.appendChild(div);
          });
        });
    }
  }
});

// ============= ADMIN PAGE (admin.js) =============
document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');

  if (!loginSection || !dashboardSection) {
    return; // Not on admin page
  }

  const hamburger = document.querySelector('.hamburger');
  if (hamburger) {
    const navLinks = document.createElement('nav');
    navLinks.className = 'nav-links';
    navLinks.innerHTML = '<a href="index.html">Home</a>';
    
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });

    hamburger.parentElement.appendChild(navLinks);
  }

  const loginForm = document.getElementById('login-form');
  const addItemForm = document.getElementById('add-item-form');
  const categorySelect = document.getElementById('category');
  const loginMessage = document.getElementById('login-message');
  let editingItemId = null;

  // Check if logged in
  if (localStorage.getItem('adminLoggedIn') === 'true') {
    showDashboard();
  } else {
    showLogin();
  }

  // Login form submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.role === 'admin') {
        localStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
      } else {
        loginMessage.textContent = 'Invalid username or password';
      }
    })
    .catch(err => {
      loginMessage.textContent = 'Login failed';
    });
  });

  function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
  }

  function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.removeItem('adminLoggedIn');
      showLogin();
    });

    // Setup page navigation
    const pageNavButtons = document.querySelectorAll('.admin-nav-btn');
    const pages = document.querySelectorAll('.admin-page');

    pageNavButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        pageNavButtons.forEach(b => b.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const pageId = btn.getAttribute('data-page') + '-page';
        document.getElementById(pageId).classList.add('active');
      });
    });

    // Load categories
    fetch('/api/categories')
      .then(response => response.json())
      .then(categories => {
        categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.name;
          option.textContent = cat.name;
          categorySelect.appendChild(option);
        });
      });

    // Handle add/update item form
    addItemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('name', document.getElementById('name').value);
      formData.append('category', categorySelect.value);
      formData.append('price', document.getElementById('price').value);
      formData.append('description', document.getElementById('description').value);
      const imageInput = document.getElementById('image');
      if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
      }

      if (editingItemId) {
        // update existing item
        fetch(`/api/items/${editingItemId}`, {
          method: 'PUT',
          body: formData
        })
        .then(response => response.json())
        .then(() => {
          alert('Item updated');
          resetAddForm();
          loadItems();
        })
        .catch(() => alert('Failed to update item'));
      } else {
        // create new item
        fetch('/api/items', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(() => {
          alert('Item added');
          addItemForm.reset();
          loadItems();
        });
      }
    });

    function resetAddForm() {
      editingItemId = null;
      addItemForm.reset();
      const submitBtn = addItemForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Add Item';
    }

    loadItems();
    loadMessages();
  }

  // Load all items
  function loadItems() {
    fetch('/api/items')
      .then(response => response.json())
      .then(items => {
        const container = document.getElementById('all-items');
        container.innerHTML = '';
        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'item';
          div.innerHTML = `
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <p>Price: KES ${item.price}</p>
            <p>Category: <strong>${item.category}</strong></p>
            <img src="${item.image}" alt="${item.name}">
            <div class="item-actions">
              <button class="edit-item-btn" data-id="${item.id}">Edit</button>
              <button class="delete-item-btn" data-id="${item.id}">Delete</button>
            </div>
          `;
          container.appendChild(div);

          const editBtn = div.querySelector('.edit-item-btn');
          const delBtn = div.querySelector('.delete-item-btn');

          if (editBtn) {
            editBtn.addEventListener('click', () => {
              editingItemId = item.id;
              document.getElementById('name').value = item.name || '';
              document.getElementById('price').value = item.price || '';
              document.getElementById('description').value = item.description || '';
              if (item.category) {
                const opt = Array.from(categorySelect.options).find(o => o.value === item.category);
                if (opt) opt.selected = true;
              }
              const submitBtn = addItemForm.querySelector('button[type="submit"]');
              if (submitBtn) submitBtn.textContent = 'Update Item';
              const itemsPage = document.getElementById('items-page');
              const messagesPage = document.getElementById('messages-page');
              if (itemsPage && messagesPage && !itemsPage.classList.contains('active')) {
                document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.admin-nav-btn[data-page="items"]').classList.add('active');
                itemsPage.classList.add('active');
                messagesPage.classList.remove('active');
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
          }

          if (delBtn) {
            delBtn.addEventListener('click', () => {
              if (!confirm('Delete this item?')) return;
              fetch(`/api/items/${item.id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(resp => {
                  if (resp.success) {
                    loadItems();
                  } else {
                    alert('Failed to delete item');
                  }
                })
                .catch(() => alert('Failed to delete item'));
            });
          }
        });
      });
  }

  // Load all contact messages
  function loadMessages() {
    fetch('/api/contacts')
      .then(response => response.json())
      .then(contacts => {
        const container = document.getElementById('messages-list');
        container.innerHTML = '';
        if (contacts.length === 0) {
          container.innerHTML = '<div class="messages-empty">No messages yet</div>';
          return;
        }
        contacts.forEach(contact => {
          const div = document.createElement('div');
          div.className = 'message-card';
          if (!contact.isRead) div.classList.add('unread');
          const date = new Date(contact.createdAt).toLocaleString();
          div.innerHTML = `
            <div class="message-card-header">
              <div class="message-card-info">
                <p class="message-card-name">${contact.name}</p>
                <p class="message-card-email"><a href="mailto:${contact.email}">${contact.email}</a></p>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <div class="message-card-date">${date}</div>
                <button class="message-read-toggle" data-id="${contact.id}">${contact.isRead ? 'Mark Unread' : 'Mark Read'}</button>
                <button class="message-delete-btn" data-id="${contact.id}" title="Delete message">Delete</button>
              </div>
            </div>
            <div class="message-card-body">${contact.message}</div>
          `;
          container.appendChild(div);

          const toggleBtn = div.querySelector('.message-read-toggle');
          if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
              const id = toggleBtn.getAttribute('data-id');
              fetch(`/api/contacts/${id}/read`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: toggleBtn.textContent === 'Mark Read' })
              })
                .then(res => res.json())
                .then(resp => {
                  if (resp.success) loadMessages();
                })
                .catch(() => alert('Failed to update read state'));
            });
          }

          const delBtn = div.querySelector('.message-delete-btn');
          if (delBtn) {
            delBtn.addEventListener('click', () => {
              if (!confirm('Delete this message?')) return;
              fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(resp => {
                  if (resp.success) {
                    loadMessages();
                  } else {
                    alert('Failed to delete message');
                  }
                })
                .catch(() => alert('Failed to delete message'));
            });
          }
        });
      })
      .catch(err => {
        console.error('Error loading messages:', err);
        document.getElementById('messages-list').innerHTML = '<div class="messages-empty">Error loading messages</div>';
      });
  }
});
