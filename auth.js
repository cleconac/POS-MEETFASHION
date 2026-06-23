function  requireRole(role)  {
   const user  =  JSON.parse(sessionStorage.getItem('pos_user') ||  '{}');
   if  (!user ||  user.role  !== role)  {
      alert('Acceso  denegado.');
      window.location.href  =  'ventas.html';
   }
}
