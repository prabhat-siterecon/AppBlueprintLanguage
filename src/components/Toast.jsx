import React from 'react'
import { Icons } from './Icons'

export default function Toast({ message }) {
  if (!message) return null
  return (
    <div className="toast">
      {Icons.check} {message}
    </div>
  )
}
