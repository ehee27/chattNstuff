import SideBarWrapper from '@/components/shared/sidebar/SideBarWrapper'
import React from 'react'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Props = React.PropsWithChildren<{}>

const Layout = ({ children }: Props) => {
  return <SideBarWrapper>{children}</SideBarWrapper>
}

export default Layout
