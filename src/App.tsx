import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CategorySuggestionPage } from './features/game/pages/CategorySuggestionPage'
import { CategoryVotingPage } from './features/game/pages/CategoryVotingPage'
import { DiscussionPage } from './features/game/pages/DiscussionPage'
import { ResultsPage } from './features/game/pages/ResultsPage'
import { RoleRevealPage } from './features/game/pages/RoleRevealPage'
import { VotingPage } from './features/game/pages/VotingPage'
import { WordSubmissionPage } from './features/game/pages/WordSubmissionPage'
import { HomePage } from './features/home/pages/HomePage'
import { CreateRoomPage } from './features/room/pages/CreateRoomPage'
import { JoinRoomPage } from './features/room/pages/JoinRoomPage'
import { LobbyPage } from './features/room/pages/LobbyPage'
import { BattlePage } from './features/game/pages/BattlePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/room/:roomCode" element={<LobbyPage />} />
        <Route path="/room/:roomCode/category-suggestion" element={<CategorySuggestionPage />} />
        <Route path="/room/:roomCode/category-voting" element={<CategoryVotingPage />} />
        <Route path="/room/:roomCode/word-submission" element={<WordSubmissionPage />} />
        <Route path="/room/:roomCode/role" element={<RoleRevealPage />} />
        <Route path="/room/:roomCode/discussion" element={<DiscussionPage />} />
        <Route path="/room/:roomCode/voting" element={<VotingPage />} />
        <Route path="/room/:roomCode/results" element={<ResultsPage />} />
        <Route path="/room/:roomCode/battle" element={<BattlePage />} />
        <Route path="/room/demo" element={<LobbyPage />} />
        <Route path="/room/demo/role" element={<RoleRevealPage />} />
        <Route path="/room/demo/discussion" element={<DiscussionPage />} />
        <Route path="/room/demo/voting" element={<VotingPage />} />
        <Route path="/room/demo/results" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
