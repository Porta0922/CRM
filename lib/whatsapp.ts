export function getWhatsAppLink(phone: string, message: string) {
  // Limpiar el número de teléfono (solo números)
  const cleanPhone = phone.replace(/\D/g, '')
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}

export const WA_MESSAGES = {
  welcome: (nombre: string, id: string, fecha: string) => 
    `¡Felicidades *${nombre}*! 🚀 Tu préstamo Nº *${id}* ha sido aprobado. El primer vencimiento es el *${fecha}*. ¡Gracias por confiar en nosotros! 😊`,
  
  reminder: (nombre: string, monto: string, dias: number | string) => 
    `Hola *${nombre}* 👋, te escribimos para recordarte que ${dias === 0 ? 'HOY' : `en ${dias} días`} vence tu cuota de *${monto}*. ¡Que tengas un gran día! ✨`,
  
  confirmation: (nombre: string, monto: string) => 
    `¡Gracias *${nombre}*! 🎉 Hemos recibido tu pago de *${monto}* correctamente. Tu saldo ha sido actualizado. ¡Feliz resto de jornada! 🌟`
}
