//! The Check4 rules engine.
//!
//! This is a byte-for-byte behavioral replica of the repo's normative
//! TypeScript engine (`src/Check4.ts` / `src/Pieces.ts`). Where this file and
//! the TypeScript engine disagree, the TypeScript engine wins.

use std::fmt;

/// The board is 4x4; coordinates run 0..=3 on both axes.
pub const BOARD_SIZE: u8 = 4;

/// One of the two players. Player One moves first.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Player {
    /// Player 1 (moves first; pawn starts facing "up", +y).
    One,
    /// Player 2 (pawn starts facing "down", -y).
    Two,
}

impl Player {
    /// The other player.
    #[must_use]
    pub fn opponent(self) -> Player {
        match self {
            Player::One => Player::Two,
            Player::Two => Player::One,
        }
    }

    /// This player's number, `1` or `2` (as used in the state key and traces).
    #[must_use]
    pub fn number(self) -> u8 {
        match self {
            Player::One => 1,
            Player::Two => 2,
        }
    }

    fn index(self) -> usize {
        match self {
            Player::One => 0,
            Player::Two => 1,
        }
    }
}

/// The four piece kinds each player owns (one of each).
///
/// The declaration order (pawn, rook, bishop, knight) is the canonical
/// enumeration order used by [`Game::legal_moves`], [`Game::state_key`] and
/// the packed state representation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PieceKind {
    /// Moves one square toward its facing direction; captures diagonally
    /// forward only; flips direction on reaching the far rows.
    Pawn,
    /// Moves any distance along a rank or file; cannot jump.
    Rook,
    /// Moves any distance diagonally; cannot jump.
    Bishop,
    /// Jumps in (2,1) / (1,2) patterns; never blocked.
    Knight,
}

impl PieceKind {
    /// All piece kinds in canonical order: pawn, rook, bishop, knight.
    pub const ALL: [PieceKind; 4] = [
        PieceKind::Pawn,
        PieceKind::Rook,
        PieceKind::Bishop,
        PieceKind::Knight,
    ];

    /// The lowercase piece name used in traces and error messages.
    #[must_use]
    pub fn name(self) -> &'static str {
        match self {
            PieceKind::Pawn => "pawn",
            PieceKind::Rook => "rook",
            PieceKind::Bishop => "bishop",
            PieceKind::Knight => "knight",
        }
    }

    fn index(self) -> usize {
        match self {
            PieceKind::Pawn => 0,
            PieceKind::Rook => 1,
            PieceKind::Bishop => 2,
            PieceKind::Knight => 3,
        }
    }
}

impl fmt::Display for PieceKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.name())
    }
}

/// A pawn's facing direction. "Up" means moving in +y, "down" in -y.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Direction {
    /// Moving in +y. Player One's pawn starts facing up.
    Up,
    /// Moving in -y. Player Two's pawn starts facing down.
    Down,
}

impl Direction {
    /// The single-character form used in the state key: `u` or `d`.
    #[must_use]
    pub fn as_char(self) -> char {
        match self {
            Direction::Up => 'u',
            Direction::Down => 'd',
        }
    }
}

/// A move request: `player` moves (or drops) their `piece` to `(x, y)`.
///
/// A piece in the gutter is dropped onto the target square; a piece on the
/// board moves there by its movement rules.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Move {
    /// The player making the move.
    pub player: Player,
    /// Which of the player's pieces to move.
    pub piece: PieceKind,
    /// Target x coordinate, 0..=3.
    pub x: u8,
    /// Target y coordinate, 0..=3.
    pub y: u8,
}

/// Why a move was rejected. Mirrors the TypeScript engine's exceptions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MoveError {
    /// The target coordinates are off the 4x4 board.
    OutOfBounds,
    /// The game already has a winner.
    GameOver,
    /// It is not the requesting player's turn.
    NotYourTurn,
    /// A piece dropped from the gutter must land on an empty square
    /// (capturing from the gutter is never allowed).
    GutterDropOnOccupiedSquare,
    /// The piece's movement rules do not allow the target square.
    IllegalPieceMove {
        /// The piece that cannot make the move.
        piece: PieceKind,
        /// Requested target x coordinate.
        x: u8,
        /// Requested target y coordinate.
        y: u8,
    },
    /// A rook or bishop would have to jump over another piece.
    PathBlocked {
        /// The piece whose path is blocked.
        piece: PieceKind,
    },
    /// The target square holds one of the moving player's own pieces.
    SelfCapture,
    /// The target is the square the piece occupied before its last move
    /// (the no-backtrack rule).
    Backtrack,
}

impl fmt::Display for MoveError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MoveError::OutOfBounds => write!(f, "coordinates are out of bounds (the board is 4x4)"),
            MoveError::GameOver => write!(f, "the game is already over"),
            MoveError::NotYourTurn => write!(f, "it's not your turn"),
            MoveError::GutterDropOnOccupiedSquare => {
                write!(
                    f,
                    "pieces moved from the gutter must be placed on an empty square"
                )
            }
            MoveError::IllegalPieceMove { piece, x, y } => {
                write!(f, "{piece} cannot move to ({x},{y})")
            }
            MoveError::PathBlocked { piece } => {
                write!(f, "{piece}s cannot jump over other pieces")
            }
            MoveError::SelfCapture => write!(f, "you cannot capture your own piece"),
            MoveError::Backtrack => {
                write!(f, "a piece cannot move back to the square it just left")
            }
        }
    }
}

impl std::error::Error for MoveError {}

/// One piece's physical state: where it stands and where it last stood.
/// `None` means the gutter (off the board).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub(crate) struct PieceState {
    /// Current square, or `None` for the gutter.
    pub(crate) pos: Option<(u8, u8)>,
    /// The one position this piece last occupied (`None` = gutter). Moving
    /// back to it is illegal; the memory overwrites on every move.
    pub(crate) prev: Option<(u8, u8)>,
}

impl PieceState {
    pub(crate) const GUTTER: PieceState = PieceState {
        pos: None,
        prev: None,
    };
}

/// Setup for a single piece when building a [`Game`] from arbitrary
/// placements. `None` coordinates mean the gutter.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
pub struct PieceSetup {
    /// The square the piece stands on, or `None` for the gutter.
    pub pos: Option<(u8, u8)>,
    /// The piece's move memory: the square it is remembered to have left
    /// (`None` = gutter, which forbids nothing).
    pub prev: Option<(u8, u8)>,
}

/// A full game description for [`Game::from_setup`]: arbitrary piece
/// placements, move memory, pawn directions, turn, turn count and winner.
///
/// Intended for tests and the future solver. Coordinates are validated;
/// consistency beyond that (e.g. two pieces sharing a square) is the
/// caller's responsibility, exactly as with the TypeScript `setState`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct GameSetup {
    /// The player to move.
    pub turn: Player,
    /// Number of plies already played (informational; not part of the
    /// state key).
    pub turn_count: u32,
    /// The winner, if the game is already over.
    pub winner: Option<Player>,
    /// The eight pieces: Player One's pawn, rook, bishop, knight, then
    /// Player Two's in the same order.
    pub pieces: [PieceSetup; 8],
    /// Pawn facing directions, `[Player One's, Player Two's]`.
    pub pawn_directions: [Direction; 2],
}

impl GameSetup {
    /// An empty board: all pieces in the gutter with wiped memory, pawns
    /// facing their starting directions, no winner, `turn_count` 0, and
    /// `turn` as given.
    #[must_use]
    pub fn empty(turn: Player) -> GameSetup {
        GameSetup {
            turn,
            turn_count: 0,
            winner: None,
            pieces: [PieceSetup::default(); 8],
            pawn_directions: [Direction::Up, Direction::Down],
        }
    }

    /// Mutable access to one piece's setup entry.
    pub fn piece_mut(&mut self, player: Player, kind: PieceKind) -> &mut PieceSetup {
        &mut self.pieces[piece_index(player, kind)]
    }
}

/// Why a [`GameSetup`] was rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SetupError {
    /// A piece's `pos` or `prev` coordinate lies off the 4x4 board.
    CoordinateOutOfBounds {
        /// Index of the offending piece in [`GameSetup::pieces`].
        piece_index: usize,
        /// The offending coordinate pair.
        coord: (u8, u8),
    },
}

impl fmt::Display for SetupError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SetupError::CoordinateOutOfBounds { piece_index, coord } => write!(
                f,
                "piece {piece_index}: coordinate ({},{}) is off the 4x4 board",
                coord.0, coord.1
            ),
        }
    }
}

impl std::error::Error for SetupError {}

/// Index of a piece in the canonical flat order: Player One's pawn, rook,
/// bishop, knight, then Player Two's in the same order.
pub(crate) fn piece_index(player: Player, kind: PieceKind) -> usize {
    player.index() * 4 + kind.index()
}

/// The Check4 game.
///
/// A two-player 4x4 abstract strategy game. Each player controls four
/// chess-flavored pieces (pawn, rook, bishop, knight) and wins by aligning
/// all four on one row, column, or either diagonal.
///
/// All pieces start in the gutter (off the board). A piece in the gutter may
/// be dropped on any empty square (never capturing). Captured pieces return
/// to the gutter with their move memory wiped. A piece may never move
/// straight back to the square it just left; the gutter counts as a
/// position, so a freshly dropped piece moves unrestricted.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Game {
    pub(crate) turn: Player,
    pub(crate) turn_count: u32,
    pub(crate) winner: Option<Player>,
    /// P1 pawn, rook, bishop, knight, then P2 in the same order.
    pub(crate) pieces: [PieceState; 8],
    /// Pawn directions, indexed by player.
    pub(crate) pawn_dirs: [Direction; 2],
}

impl Default for Game {
    fn default() -> Game {
        Game::new()
    }
}

impl Game {
    /// A fresh game: every piece in the gutter, Player One to move, Player
    /// One's pawn facing up and Player Two's facing down.
    #[must_use]
    pub fn new() -> Game {
        Game {
            turn: Player::One,
            turn_count: 0,
            winner: None,
            pieces: [PieceState::GUTTER; 8],
            pawn_dirs: [Direction::Up, Direction::Down],
        }
    }

    /// Build a game from arbitrary piece placements. Validates that every
    /// coordinate lies on the 4x4 board.
    ///
    /// Like the TypeScript `setState`, this does not check higher-level
    /// consistency (such as overlapping pieces); garbage in, garbage out.
    pub fn from_setup(setup: &GameSetup) -> Result<Game, SetupError> {
        for (i, ps) in setup.pieces.iter().enumerate() {
            for coord in [ps.pos, ps.prev].into_iter().flatten() {
                if coord.0 >= BOARD_SIZE || coord.1 >= BOARD_SIZE {
                    return Err(SetupError::CoordinateOutOfBounds {
                        piece_index: i,
                        coord,
                    });
                }
            }
        }

        Ok(Game {
            turn: setup.turn,
            turn_count: setup.turn_count,
            winner: setup.winner,
            pieces: setup.pieces.map(|ps| PieceState {
                pos: ps.pos,
                prev: ps.prev,
            }),
            pawn_dirs: setup.pawn_directions,
        })
    }

    /// The player whose turn it is. Meaningful only while the game has no
    /// winner (after a winning move the turn has already flipped to the
    /// loser, exactly as in the TypeScript engine).
    #[must_use]
    pub fn turn(&self) -> Player {
        self.turn
    }

    /// The winner, or `None` while the game is still running.
    #[must_use]
    pub fn winner(&self) -> Option<Player> {
        self.winner
    }

    /// Number of plies played so far. Excluded from [`Game::state_key`].
    #[must_use]
    pub fn turn_count(&self) -> u32 {
        self.turn_count
    }

    /// A piece's current square, or `None` if it is in the gutter.
    #[must_use]
    pub fn piece_position(&self, player: Player, kind: PieceKind) -> Option<(u8, u8)> {
        self.pieces[piece_index(player, kind)].pos
    }

    /// A piece's move memory: the one square it last occupied, or `None`
    /// for the gutter (which forbids nothing).
    #[must_use]
    pub fn piece_prev(&self, player: Player, kind: PieceKind) -> Option<(u8, u8)> {
        self.pieces[piece_index(player, kind)].prev
    }

    /// The facing direction of a player's pawn.
    #[must_use]
    pub fn pawn_direction(&self, player: Player) -> Direction {
        self.pawn_dirs[player.index()]
    }

    /// Execute a move, or return the first violated rule without mutating
    /// anything.
    pub fn take_turn(&mut self, mv: Move) -> Result<(), MoveError> {
        self.validate(mv)?;
        self.apply(mv);
        self.finalize(mv);
        Ok(())
    }

    /// Check whether a move is valid without mutating game state.
    #[must_use]
    pub fn move_is_valid(&self, mv: Move) -> bool {
        self.validate(mv).is_ok()
    }

    /// Enumerate every legal move for the player to move, in canonical
    /// order: piece pawn, rook, bishop, knight; x outer 0..=3; y inner
    /// 0..=3. Empty once the game has a winner.
    #[must_use]
    pub fn legal_moves(&self) -> Vec<Move> {
        let mut moves = Vec::new();
        if self.winner.is_some() {
            return moves;
        }

        for piece in PieceKind::ALL {
            for x in 0..BOARD_SIZE {
                for y in 0..BOARD_SIZE {
                    let mv = Move {
                        player: self.turn,
                        piece,
                        x,
                        y,
                    };
                    if self.validate(mv).is_ok() {
                        moves.push(mv);
                    }
                }
            }
        }

        moves
    }

    /// Forfeit the game: the given player (default: the player to move)
    /// loses and their opponent becomes the winner.
    pub fn forfeit(&mut self, player: Option<Player>) {
        let loser = player.unwrap_or(self.turn);
        self.winner = Some(loser.opponent());
    }

    /// The canonical position-identity string, byte-for-byte identical to
    /// the TypeScript engine's `stateKey()`:
    ///
    /// `t<turn>|w<winner or ->|<p1key>|<p2key>` where each player key is
    /// `pieceKey(pawn),pieceKey(rook),pieceKey(bishop),pieceKey(knight),<u|d>`
    /// and a piece key is four characters — x, y, prevX, prevY — each a
    /// decimal digit or `-` for the gutter.
    ///
    /// `turn_count` is deliberately excluded so the key can be used for
    /// repetition detection. Two states with equal keys have identical
    /// legal moves. After a winning move the key shows the opponent as the
    /// player to move (the turn flips before the win check), e.g. `t2|w1|...`.
    #[must_use]
    pub fn state_key(&self) -> String {
        fn coord_char(v: Option<u8>) -> char {
            match v {
                Some(v) => char::from(b'0' + v),
                None => '-',
            }
        }

        let mut key = String::with_capacity(48);
        key.push('t');
        key.push(char::from(b'0' + self.turn.number()));
        key.push('|');
        key.push('w');
        key.push(match self.winner {
            Some(p) => char::from(b'0' + p.number()),
            None => '-',
        });

        for player in [Player::One, Player::Two] {
            key.push('|');
            for kind in PieceKind::ALL {
                let piece = self.pieces[piece_index(player, kind)];
                key.push(coord_char(piece.pos.map(|c| c.0)));
                key.push(coord_char(piece.pos.map(|c| c.1)));
                key.push(coord_char(piece.prev.map(|c| c.0)));
                key.push(coord_char(piece.prev.map(|c| c.1)));
                key.push(',');
            }
            key.push(self.pawn_dirs[player.index()].as_char());
        }

        key
    }

    /* =========================
       Core move pipeline
    ========================= */

    /// Run the full rules check for a move without mutating state,
    /// reporting the first violated rule. The check order mirrors the
    /// TypeScript `_validateMove` pipeline.
    fn validate(&self, mv: Move) -> Result<(), MoveError> {
        if mv.x >= BOARD_SIZE || mv.y >= BOARD_SIZE {
            return Err(MoveError::OutOfBounds);
        }
        if self.winner.is_some() {
            return Err(MoveError::GameOver);
        }
        if mv.player != self.turn {
            return Err(MoveError::NotYourTurn);
        }

        let piece = self.pieces[piece_index(mv.player, mv.piece)];
        let occupant = self.occupant(mv.x, mv.y);

        let Some(from) = piece.pos else {
            // Gutter drop: legal iff the target square is empty.
            return match occupant {
                Some(_) => Err(MoveError::GutterDropOnOccupiedSquare),
                None => Ok(()),
            };
        };

        if !self.piece_can_move(mv.player, mv.piece, from, (mv.x, mv.y), occupant.is_some()) {
            return Err(MoveError::IllegalPieceMove {
                piece: mv.piece,
                x: mv.x,
                y: mv.y,
            });
        }

        if matches!(mv.piece, PieceKind::Rook | PieceKind::Bishop)
            && !self.path_clear(from, (mv.x, mv.y))
        {
            return Err(MoveError::PathBlocked { piece: mv.piece });
        }

        if let Some((owner, _)) = occupant {
            if owner == mv.player {
                return Err(MoveError::SelfCapture);
            }
        }

        if piece.prev == Some((mv.x, mv.y)) {
            return Err(MoveError::Backtrack);
        }

        Ok(())
    }

    /// Movement-shape check (the TypeScript `canMove`). `from` is on the
    /// board; gutter drops never reach this.
    fn piece_can_move(
        &self,
        player: Player,
        kind: PieceKind,
        from: (u8, u8),
        to: (u8, u8),
        is_attack: bool,
    ) -> bool {
        let dx = to.0 as i8 - from.0 as i8;
        let dy = to.1 as i8 - from.1 as i8;

        match kind {
            PieceKind::Pawn => {
                // A pawn never moves more than one square.
                if dx.abs() > 1 || dy.abs() > 1 {
                    return false;
                }
                // It only ever advances in its facing direction.
                let forward = match self.pawn_dirs[player.index()] {
                    Direction::Up => 1,
                    Direction::Down => -1,
                };
                if dy != forward {
                    return false;
                }
                // Diagonal is legal only as a capture; straight only when
                // not a capture; sideways never (dy is forward here, so
                // dx != 0 means diagonal).
                if dx != 0 {
                    is_attack
                } else {
                    !is_attack
                }
            }
            PieceKind::Rook => dx == 0 || dy == 0,
            PieceKind::Bishop => dx.abs() == dy.abs(),
            PieceKind::Knight => {
                (dx.abs() == 2 && dy.abs() == 1) || (dx.abs() == 1 && dy.abs() == 2)
            }
        }
    }

    /// True when every square strictly between `from` and `to` (a straight
    /// or diagonal line) is empty.
    fn path_clear(&self, from: (u8, u8), to: (u8, u8)) -> bool {
        let step_x = (to.0 as i8 - from.0 as i8).signum();
        let step_y = (to.1 as i8 - from.1 as i8).signum();

        let mut x = from.0 as i8 + step_x;
        let mut y = from.1 as i8 + step_y;
        while (x, y) != (to.0 as i8, to.1 as i8) {
            if self.occupant(x as u8, y as u8).is_some() {
                return false;
            }
            x += step_x;
            y += step_y;
        }

        true
    }

    /// Apply an already-validated move: a captured enemy piece returns to
    /// the gutter with its memory wiped, then the mover lands on the target
    /// remembering the square (or gutter) it left.
    fn apply(&mut self, mv: Move) {
        if let Some((owner, kind)) = self.occupant(mv.x, mv.y) {
            self.pieces[piece_index(owner, kind)] = PieceState::GUTTER;
        }

        let piece = &mut self.pieces[piece_index(mv.player, mv.piece)];
        piece.prev = piece.pos;
        piece.pos = Some((mv.x, mv.y));
    }

    /// Orient the mover's pawn, advance the turn, then check for a win by
    /// the mover — in exactly that order, so a winning state shows the
    /// opponent as the player to move.
    fn finalize(&mut self, mv: Move) {
        if mv.piece == PieceKind::Pawn {
            let dir = &mut self.pawn_dirs[mv.player.index()];
            if mv.y == 0 {
                *dir = Direction::Up;
            }
            if mv.y == BOARD_SIZE - 1 {
                *dir = Direction::Down;
            }
        }

        self.turn = self.turn.opponent();
        self.turn_count += 1;

        if self.player_aligned(mv.player) {
            self.winner = Some(mv.player);
        }
    }

    /* =========================
       Helpers
    ========================= */

    /// The piece standing on `(x, y)`, if any.
    fn occupant(&self, x: u8, y: u8) -> Option<(Player, PieceKind)> {
        for player in [Player::One, Player::Two] {
            for kind in PieceKind::ALL {
                if self.pieces[piece_index(player, kind)].pos == Some((x, y)) {
                    return Some((player, kind));
                }
            }
        }
        None
    }

    /// True when all four of `player`'s pieces are on the board and aligned
    /// on one row, one column, the diagonal (equal x - y) or the
    /// anti-diagonal (equal x + y).
    pub(crate) fn player_aligned(&self, player: Player) -> bool {
        let base = player.index() * 4;
        let mut coords = [(0u8, 0u8); 4];
        for (coord, piece) in coords.iter_mut().zip(&self.pieces[base..base + 4]) {
            match piece.pos {
                Some(pos) => *coord = pos,
                None => return false,
            }
        }

        let (x0, y0) = coords[0];
        coords.iter().all(|&(_, y)| y == y0)
            || coords.iter().all(|&(x, _)| x == x0)
            || coords
                .iter()
                .all(|&(x, y)| x as i8 - y as i8 == x0 as i8 - y0 as i8)
            || coords.iter().all(|&(x, y)| x + y == x0 + y0)
    }
}
