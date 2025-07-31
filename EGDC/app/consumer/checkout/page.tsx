'use client'

import React from 'react'
import ConsumerLayout from '../../../components/consumer/ConsumerLayout'
import CheckoutFlow from '../../../components/consumer/CheckoutFlow'

const CheckoutPage: React.FC = () => {
  return (
    <ConsumerLayout>
      <CheckoutFlow />
    </ConsumerLayout>
  )
}

export default CheckoutPage