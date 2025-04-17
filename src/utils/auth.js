export const checkAdminStatus = () => {
    // Implement your admin check logic
    // Could check localStorage, cookies, or make an API call
    return localStorage.getItem('isAdmin') === 'true'
  }
  
  export const setAdminStatus = (status) => {
    localStorage.setItem('isAdmin', status)
  }