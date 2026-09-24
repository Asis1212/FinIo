import styled from 'styled-components'

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
)

const HistoryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
)

const RecurringIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
)

const CategoriesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const NAV_ITEMS = [
  { val: "dashboard",  label: "בית",      Icon: HomeIcon },
  { val: "history",    label: "היסטוריה", Icon: HistoryIcon },
  { val: "recurring",  label: "קבוע",     Icon: RecurringIcon },
  { val: "categories", label: "קטגוריות", Icon: CategoriesIcon },
]

function Navbar({activePage, onPageChange}) {
  const leftItems  = [NAV_ITEMS[0], NAV_ITEMS[1]]
  const rightItems = [NAV_ITEMS[2], NAV_ITEMS[3]]

  return (
    <Container>
      {leftItems.map((item) => (
        <NavButton
          key={item.val}
          $active={activePage === item.val}
          onClick={() => onPageChange(item.val)}
        >
          <BtnIcon $active={activePage === item.val}><item.Icon /></BtnIcon>
          <BtnLabel $active={activePage === item.val}>{item.label}</BtnLabel>
          {activePage === item.val && <ActiveDot />}
        </NavButton>
      ))}

      <AddButtonWrapper>
        <AddButton
          $active={activePage === "add"}
          onClick={() => onPageChange("add")}
        >
          <AddIcon $active={activePage === "add"}>+</AddIcon>
        </AddButton>
        <BtnLabel $active={activePage === "add"} style={{ marginTop: 4 }}>הוסף</BtnLabel>
      </AddButtonWrapper>

      {rightItems.map((item) => (
        <NavButton
          key={item.val}
          $active={activePage === item.val}
          onClick={() => onPageChange(item.val)}
        >
          <BtnIcon $active={activePage === item.val}><item.Icon /></BtnIcon>
          <BtnLabel $active={activePage === item.val}>{item.label}</BtnLabel>
          {activePage === item.val && <ActiveDot />}
        </NavButton>
      ))}
    </Container>
  )
}

export default Navbar;

const Container = styled.div`
  flex-shrink: 0;
  background: rgba(13, 17, 23, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(99, 102, 241, 0.12);
  display: flex;
  align-items: center;
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.4);
  padding-bottom: env(safe-area-inset-bottom);
  height: 64px;
`;

const NavButton = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: none;
  padding-block: 8px;
  cursor: pointer;
  font-family: inherit;
  background: transparent;
  border-radius: 14px;
  margin: 6px 2px;
  transition: background 0.15s;
  position: relative;

  &:active {
    background: rgba(99, 102, 241, 0.08);
    transform: scale(0.95);
  }
`;

const ActiveDot = styled.div`
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #6366f1;
  box-shadow: 0 0 6px rgba(99, 102, 241, 0.8);
`;

const AddButtonWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  top: -16px;
`;

const AddButton = styled.button`
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: none;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, #818cf8, #6366f1)"
      : "linear-gradient(135deg, #6366f1, #8b5cf6)"};
  cursor: pointer;
  box-shadow: 0 6px 24px rgba(99, 102, 241, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;

  &:active {
    transform: scale(0.9);
    box-shadow: 0 3px 12px rgba(99, 102, 241, 0.35);
  }
`;

const AddIcon = styled.span`
  font-size: 28px;
  font-weight: 300;
  color: white;
  line-height: 1;
  margin-top: -2px;
`;

const BtnIcon = styled.span`
  color: ${({ $active }) => $active ? "#a5b4fc" : "#4a5568"};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
`;

const BtnLabel = styled.span`
  font-size: 10px;
  font-weight: ${({ $active }) => $active ? 700 : 400};
  color: ${({ $active }) => $active ? "#a5b4fc" : "#4a5568"};
  transition: color 0.2s;
`;
