
import { Routes, Route } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import Header from './components/Header'
import Jobs from './pages/Jobs'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import { themeStore } from './stores/themestores'

const App = observer(() => {
  return (
    
    < >
    <main data-theme={themeStore.theme} >
      <Header  />
      <Routes>
        <Route path="/" element={<Jobs />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </main>
    </>
  )
})

export default App
