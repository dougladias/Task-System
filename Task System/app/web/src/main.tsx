import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import createLoginRoute from './routes/login.tsx'
import createRegisterRoute from './routes/register.tsx'

import Header from './components/Header'
import { useAuth } from './contexts/AuthContext'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { TasksProvider } from './contexts/TasksContext.tsx'
import { NotificationsProvider } from './contexts/NotificationsContext.tsx'
import { ToastProvider } from './components/ui/toast.tsx'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

import App from './App.tsx'

const RootComponent = () => {
  const { isAuthenticated } = useAuth()

  return (
    <>
      {isAuthenticated && <Header />}
      <Outlet />
      <TanStackRouterDevtools />
    </>
  )
}

const rootRoute = createRootRoute({
  component: RootComponent,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: App,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  createLoginRoute(rootRoute),
  createRegisterRoute(rootRoute),
])

const TanStackQueryProviderContext = TanStackQueryProvider.getContext()
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
        <ToastProvider>
          <AuthProvider>
            <TasksProvider>
              <NotificationsProvider>
                <RouterProvider router={router} />
              </NotificationsProvider>
            </TasksProvider>
          </AuthProvider>
        </ToastProvider>
      </TanStackQueryProvider.Provider>
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
