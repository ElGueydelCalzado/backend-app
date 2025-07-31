'use client'

import React from 'react'
import ConsumerLayout from '../../../components/consumer/ConsumerLayout'
import ProductCatalog from '../../../components/consumer/ProductCatalog'

const CatalogoPage: React.FC = () => {
  return (
    <ConsumerLayout>
      <ProductCatalog />
    </ConsumerLayout>
  )
}

export default CatalogoPage