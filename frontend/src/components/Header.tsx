import { observer } from 'mobx-react-lite'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { daisyThemes } from '../types/themes'
import { themeStore } from '../stores/themestores'


const Header = observer(() => {

  return (
    <header className="flex justify-between p-4 items-center bg-base-300 shadow-sm">
      <h1 className="text-3xl font-bold">RozgaarTrack</h1>
      <nav className='flex gap-2 items-center justify-center '>
        <ul className="flex gap-4 text-lg font-medium">
          <li><Link to="/dashboard">Dashboard</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/">Jobs</Link></li>
        </ul>
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn bg-base-100 m-1 rounded-full">
          {themeStore.theme.charAt(0).toUpperCase() + themeStore.theme.slice(1)} <Icon icon="mdi:palette" />
        </div>
        <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box w-[25vw]  p-2 shadow h-[90vh] overflow-auto">
          {daisyThemes.map((theme) => (
            <li key={theme}>
              <a onClick={() => themeStore.setTheme(theme)}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </a>
            </li>
          ))}
        </ul>
      </div>
      </nav>

    </header>
  )
})

export default Header
