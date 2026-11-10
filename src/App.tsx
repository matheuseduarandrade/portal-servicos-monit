import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth, RequireAdmin } from '@/components/layout/RequireAuth'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Sistemas from '@/pages/Sistemas'
import Projetos from '@/pages/Projetos'
import Tecnicos from '@/pages/Tecnicos'
import Forum from '@/pages/Forum'
import ForumManual from '@/pages/ForumManual'
import Colaboradores from '@/pages/Colaboradores'
import Calendario from '@/pages/Calendario'
import Comunicados from '@/pages/Comunicados'
import Usuarios from '@/pages/Usuarios'
import Configuracoes from '@/pages/Configuracoes'
import ControleAcesso from '@/pages/ControleAcesso'
import Quiz from '@/pages/Quiz'
import QuizRealizar from '@/pages/QuizRealizar'
import QuizAdmin from '@/pages/QuizAdmin'
import ValidarCertificado from '@/pages/ValidarCertificado'
import Busca from '@/pages/Busca'
import QuizLive from '@/pages/QuizLive'
import QuizLiveHost from '@/pages/QuizLiveHost'
import QuizLiveParticipant from '@/pages/QuizLiveParticipant'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/validar" element={<ValidarCertificado />} />
              <Route path="/validar/:codigo" element={<ValidarCertificado />} />
              {/* Link público: participantes do Quiz Live não precisam de login no Portal. */}
              <Route path="/quiz-live/participar/:codigo?" element={<QuizLiveParticipant />} />
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Home />} />
                <Route path="/sistemas" element={<Sistemas />} />
                <Route path="/projetos" element={<Projetos />} />
                <Route path="/tecnicos" element={<Tecnicos />} />
                <Route path="/biblioteca" element={<Forum />} />
                <Route path="/biblioteca/:id" element={<ForumManual />} />
                <Route path="/colaboradores" element={<Colaboradores />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/comunicados" element={<Comunicados />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/busca" element={<Busca />} />
                <Route path="/quiz-live" element={<RequireAdmin><QuizLive /></RequireAdmin>} />
                <Route path="/quiz-live/sala/:id" element={<RequireAdmin><QuizLiveHost /></RequireAdmin>} />
                <Route path="/quiz/fazer/:trilhaId/:nivel" element={<QuizRealizar />} />
                <Route
                  path="/quiz/admin"
                  element={
                    <RequireAdmin>
                      <QuizAdmin />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <RequireAdmin>
                      <Usuarios />
                    </RequireAdmin>
                  }
                />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route
                  path="/controle-acesso"
                  element={
                    <RequireAdmin>
                      <ControleAcesso />
                    </RequireAdmin>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
