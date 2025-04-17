// Footer.vue
<template>
    <footer>
      <div class="social-icons">
        <a href="https://facebook.com" target="_blank">
          <i class="fab fa-facebook-f"></i>
        </a>
        <a href="https://instagram.com" target="_blank">
          <i class="fab fa-instagram"></i>
        </a>
      </div>
    </footer>
  </template>
  
  <script>
  export default {
    name: 'Footer'
  }
  </script>
  
  <style scoped>
  footer {
    padding: 20px;
    background-color: #FFC107;
  }
  
  .social-icons {
    display: flex;
    justify-content: center;
    gap: 20px;
  }
  
  .social-icons a {
    color: #000;
    font-size: 24px;
    transition: color 0.3s;
  }
  
  .social-icons a:hover {
    color: #666;
  }
  </style>
