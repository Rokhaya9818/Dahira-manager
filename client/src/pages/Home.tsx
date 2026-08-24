import { getSuggestedOrganizer, isCheckInOpen, type AppRole } from "@shared/dahiraRules";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarCheck2,
  CalendarClock,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Crown,
  Ellipsis,
  Home as HomeIcon,
  Landmark,
  ListChecks,
  Menu,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "dashboard" | "members" | "contributions" | "treasury" | "goudi" | "attendance";
type MemberStatus = "À jour" | "En attente" | "En retard";

type Member = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  role: "Administrateur" | "Trésorier" | "Membre";
  responsibility: string;
  status: MemberStatus;
  attendance: string;
  rotation: number;
};

type AccountRequest = {
  id: number;
  name: string;
  phone: string;
  status: "En attente" | "Refusé";
  requestedAt: string;
};

const initialMembers: Member[] = [
  { id: "abdou", name: "Abdou Diop", initials: "AD", phone: "77 245 67 18", role: "Administrateur", responsibility: "Coordonnateur", status: "À jour", attendance: "18 / 20", rotation: 1 },
  { id: "mamadou", name: "Mamadou Fall", initials: "MF", phone: "77 985 41 26", role: "Membre", responsibility: "Membre actif", status: "À jour", attendance: "17 / 20", rotation: 2 },
  { id: "awa", name: "Awa Ndiaye", initials: "AN", phone: "76 640 19 80", role: "Trésorier", responsibility: "Trésorière", status: "En attente", attendance: "16 / 20", rotation: 3 },
  { id: "moussa", name: "Moussa Sarr", initials: "MS", phone: "78 310 54 91", role: "Membre", responsibility: "Membre actif", status: "En retard", attendance: "14 / 20", rotation: 4 },
  { id: "fatou", name: "Fatou Seck", initials: "FS", phone: "77 527 93 45", role: "Membre", responsibility: "Membre actif", status: "À jour", attendance: "15 / 20", rotation: 5 },
];

const navItems: { id: View; label: string; icon: typeof HomeIcon; adminOnly?: boolean; treasury?: boolean }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: HomeIcon },
  { id: "members", label: "Membres", icon: Users, adminOnly: true },
  { id: "contributions", label: "Cotisations", icon: ReceiptText, treasury: true },
  { id: "treasury", label: "Caisse", icon: WalletCards, treasury: true },
  { id: "goudi", label: "Goudi Adjouma", icon: CalendarClock },
  { id: "attendance", label: "Présences", icon: CalendarCheck2 },
];

const organizerHistory = [
  { memberId: "moussa", scheduledFor: new Date(2026, 7, 13).getTime() },
  { memberId: "fatou", scheduledFor: new Date(2026, 7, 20).getTime() },
  { memberId: "abdou", scheduledFor: new Date(2026, 7, 27).getTime() },
];

const attendanceHistoryByMember: Record<string, { date: string; status: string; time: string }[]> = {
  abdou: [{ date: "Jeudi 27 août 2026", status: "Présence enregistrée", time: "21:16" }, { date: "Jeudi 20 août 2026", status: "Présence enregistrée", time: "21:08" }, { date: "Jeudi 13 août 2026", status: "Présence enregistrée", time: "21:11" }],
  mamadou: [{ date: "Jeudi 27 août 2026", status: "Présence enregistrée", time: "21:02" }, { date: "Jeudi 20 août 2026", status: "Présence enregistrée", time: "21:20" }, { date: "Jeudi 13 août 2026", status: "Non pointé", time: "—" }],
  awa: [{ date: "Jeudi 27 août 2026", status: "Présence enregistrée", time: "21:24" }, { date: "Jeudi 20 août 2026", status: "Non pointé", time: "—" }, { date: "Jeudi 13 août 2026", status: "Présence enregistrée", time: "21:09" }],
  moussa: [{ date: "Jeudi 27 août 2026", status: "Non pointé", time: "—" }, { date: "Jeudi 20 août 2026", status: "Présence enregistrée", time: "21:36" }, { date: "Jeudi 13 août 2026", status: "Présence enregistrée", time: "21:13" }],
  fatou: [{ date: "Jeudi 27 août 2026", status: "Présence enregistrée", time: "21:18" }, { date: "Jeudi 20 août 2026", status: "Présence enregistrée", time: "21:22" }, { date: "Jeudi 13 août 2026", status: "Présence enregistrée", time: "21:05" }],
};

const contributionHistoryByMember: Record<string, { period: string; amount: string; status: MemberStatus }[]> = {
  abdou: [{ period: "Mars 2026", amount: "2 000 F", status: "À jour" }, { period: "Février 2026", amount: "2 000 F", status: "À jour" }],
  mamadou: [{ period: "Mars 2026", amount: "2 000 F", status: "À jour" }, { period: "Février 2026", amount: "2 000 F", status: "À jour" }],
  awa: [{ period: "Mars 2026", amount: "2 000 F", status: "En attente" }, { period: "Février 2026", amount: "2 000 F", status: "À jour" }],
  moussa: [{ period: "Mars 2026", amount: "2 000 F", status: "En retard" }, { period: "Février 2026", amount: "2 000 F", status: "En retard" }],
  fatou: [{ period: "Mars 2026", amount: "2 000 F", status: "À jour" }, { period: "Février 2026", amount: "2 000 F", status: "À jour" }],
};

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

function vapidKeyToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, character => character.charCodeAt(0));
}

function money(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " F";
}

function StatusPill({ status }: { status: MemberStatus }) {
  const styles: Record<MemberStatus, string> = {
    "À jour": "bg-[#e5f2e8] text-[#237044]",
    "En attente": "bg-[#f9eed5] text-[#9a6b14]",
    "En retard": "bg-[#fae6df] text-[#b85030]",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}>{status}</span>;
}

function Avatar({ member, size = "md" }: { member: Member; size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "lg" ? "h-12 w-12 text-sm" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  return <span className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#e6efe7] font-bold text-[#165743]`}>{member.initials}</span>;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-lg font-bold tracking-tight text-[#123e32]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [role, setRole] = useState<AppRole>("member");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSessionToken, setMemberSessionToken] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState("");
  const [suggestionConfirmed, setSuggestionConfirmed] = useState(false);
  const [organizerId, setOrganizerId] = useState("");
  const [search, setSearch] = useState("");
  const [remindedMembers, setRemindedMembers] = useState<string[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberSecret, setNewMemberSecret] = useState("");
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [accountMode, setAccountMode] = useState<"login" | "signup">("login");
  const [accountName, setAccountName] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [accountSecret, setAccountSecret] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const [recordModal, setRecordModal] = useState<"contribution" | "treasury" | null>(null);
  const [recordMemberId, setRecordMemberId] = useState("");
  const [recordPeriod, setRecordPeriod] = useState("Septembre 2026");
  const [recordAmount, setRecordAmount] = useState("2000");
  const [recordCategory, setRecordCategory] = useState("Cotisation");
  const [recordDescription, setRecordDescription] = useState("");
  const [recordKind, setRecordKind] = useState<"income" | "expense">("income");

  const memberSessionQuery = trpc.memberAuth.me.useQuery({ token: memberSessionToken || undefined });
  const hasMemberSession = Boolean(memberSessionQuery.data);
  const pendingAccountsQuery = trpc.memberAuth.pending.useQuery({ token: "cookie-session" }, { enabled: hasMemberSession && role === "admin" });
  const persistentMembersQuery = trpc.dahira.members.useQuery({ token: "cookie-session" }, { enabled: hasMemberSession });
  const dashboardQuery = trpc.dahira.dashboard.useQuery({ token: "cookie-session" }, { enabled: hasMemberSession });
  const persistedGoudiQuery = trpc.dahira.goudi.useQuery({ token: "cookie-session" }, { enabled: hasMemberSession });
  const attendanceQuery = trpc.dahira.attendance.useQuery({ token: "cookie-session" }, { enabled: hasMemberSession });
  const contributionQuery = trpc.dahira.contributionList.useQuery({ token: "cookie-session" }, { enabled: hasMemberSession });
  const treasuryQuery = trpc.dahira.treasuryList.useQuery({ token: "cookie-session" }, { enabled: hasMemberSession && role !== "member" });
  const webPushPublicKeyQuery = trpc.webPush.publicKey.useQuery();
  const registerAccountMutation = trpc.memberAuth.register.useMutation();
  const loginAccountMutation = trpc.memberAuth.login.useMutation();
  const approveAccountMutation = trpc.memberAuth.approve.useMutation();
  const rejectAccountMutation = trpc.memberAuth.reject.useMutation();
  const setAccountRoleMutation = trpc.memberAuth.setRole.useMutation();
  const checkInMutation = trpc.dahira.checkIn.useMutation();
  const saveGoudiMutation = trpc.dahira.saveGoudi.useMutation();
  const recordContributionMutation = trpc.dahira.recordContribution.useMutation();
  const recordTreasuryMutation = trpc.dahira.recordTreasury.useMutation();
  const subscribePushMutation = trpc.webPush.subscribe.useMutation();
  const notifyPushMutation = trpc.webPush.notifyMembers.useMutation();

  useEffect(() => { if (memberSessionQuery.data) setRole(memberSessionQuery.data.role); }, [memberSessionQuery.data]);
  useEffect(() => {
    if (!hasMemberSession || !persistentMembersQuery.data) return;
    setMembers(persistentMembersQuery.data.map(account => ({
      id: `member-${account.id}`,
      name: account.name,
      initials: account.name.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase(),
      phone: account.phone,
      role: account.role === "admin" ? "Administrateur" : account.role === "treasurer" ? "Trésorier" : "Membre",
      responsibility: account.responsibility,
      status: "En attente",
      attendance: `${account.attendanceCount} présence${account.attendanceCount > 1 ? "s" : ""}`,
      rotation: account.rotationIndex,
    })));
  }, [hasMemberSession, persistentMembersQuery.data]);

  const accountRequests: AccountRequest[] = (pendingAccountsQuery.data ?? []).map(account => ({
    id: account.id,
    name: account.name,
    phone: account.phone,
    status: account.status === "rejected" ? "Refusé" : "En attente",
    requestedAt: new Date(account.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  }));

  const canSee = (item: (typeof navItems)[number]) => {
    if (role === "admin") return true;
    if (role === "treasurer") return !item.adminOnly;
    return ["dashboard", "goudi", "attendance"].includes(item.id);
  };

  const visibleNav = navItems.filter(canSee);
  const suggestedOrganizer = members.find(member => member.id === `member-${persistedGoudiQuery.data?.suggestedOrganizer?.id}`);
  const organizer = members.find(member => member.id === (organizerId || suggestedOrganizer?.id)) ?? { id: "", name: "À définir", initials: "—", phone: "", role: "Membre" as const, responsibility: "En attente de membres actifs", status: "En attente" as MemberStatus, attendance: "0 présence", rotation: 0 };
  const checkInOpen = isCheckInOpen(new Date());
  const filteredMembers = members.filter(member => member.name.toLowerCase().includes(search.toLowerCase()) || member.phone.includes(search));
  const regularMembers = useMemo(() => [...members].sort((a, b) => Number(b.attendance.split(" ")[0]) - Number(a.attendance.split(" ")[0])).slice(0, 3), [members]);
  const mobileNav = ["dashboard", "contributions", "goudi", "attendance"] as View[];
  const mobileNavItems = navItems.filter(item => mobileNav.includes(item.id) && canSee(item));
  const activeDataLoading = hasMemberSession && (
    (view === "dashboard" && dashboardQuery.isLoading) ||
    (view === "members" && persistentMembersQuery.isLoading) ||
    (view === "contributions" && contributionQuery.isLoading) ||
    (view === "treasury" && treasuryQuery.isLoading) ||
    (view === "goudi" && persistedGoudiQuery.isLoading) ||
    (view === "attendance" && attendanceQuery.isLoading)
  );
  const activeDataError = view === "members" ? persistentMembersQuery.error : view === "contributions" ? contributionQuery.error : view === "treasury" ? treasuryQuery.error : view === "goudi" ? persistedGoudiQuery.error : view === "attendance" ? attendanceQuery.error : dashboardQuery.error;
  const dashboardMetrics = dashboardQuery.data ?? { memberCount: 0, received: 0, expected: 0, treasury: 0, attendanceCount: 0, paidCount: 0, pendingCount: 0, lateCount: 0 };

  const approveRequest = (request: AccountRequest) => {
    if (!hasMemberSession) return;
    approveAccountMutation.mutate({ token: "cookie-session", accountId: request.id }, {
      onSuccess: () => {
        void pendingAccountsQuery.refetch();
        void persistentMembersQuery.refetch();
        void dashboardQuery.refetch();
      },
    });
  };

  const rejectRequest = (id: number) => {
    if (!hasMemberSession) return;
    rejectAccountMutation.mutate({ token: "cookie-session", accountId: id }, { onSuccess: () => void pendingAccountsQuery.refetch() });
  };

  const updateMemberRole = (memberId: string, nextRole: Member["role"]) => {
    setMembers(previous => previous.map(member => member.id === memberId ? { ...member, role: nextRole, responsibility: nextRole === "Administrateur" ? "Responsable du Dahira" : nextRole === "Trésorier" ? "Gestion de la caisse" : "Membre actif" } : member));
    setSelectedMember(previous => previous?.id === memberId ? { ...previous, role: nextRole, responsibility: nextRole === "Administrateur" ? "Responsable du Dahira" : nextRole === "Trésorier" ? "Gestion de la caisse" : "Membre actif" } : previous);
    const accountId = Number(memberId.replace("member-", ""));
    if (memberId.startsWith("member-") && Number.isInteger(accountId) && hasMemberSession) {
      setAccountRoleMutation.mutate({ token: "cookie-session", accountId, role: nextRole === "Administrateur" ? "admin" : nextRole === "Trésorier" ? "treasurer" : "member" });
    }
  };

  const selectView = (nextView: View) => {
    setView(nextView);
    setIsMobileMenuOpen(false);
  };

  const checkIn = () => {
    if (!hasMemberSession) {
      setAccountMode("login");
      setAccountNotice("Connectez-vous pour enregistrer votre présence.");
      setShowAccountPanel(true);
      return;
    }
    checkInMutation.mutate({ token: "cookie-session" }, {
      onSuccess: result => setAccountNotice(result.alreadyCheckedIn ? "Votre présence a déjà été enregistrée pour ce jeudi." : "Votre présence a été enregistrée."),
      onError: error => setAccountNotice(error.message),
    });
  };

  const confirmGoudi = () => {
    const accountId = Number(organizer.id.replace("member-", ""));
    if (!hasMemberSession || !Number.isInteger(accountId)) return;
    saveGoudiMutation.mutate({
      token: "cookie-session",
      organizerAccountId: accountId,
      contributionExpected: 10000,
      scheduledFor: new Date(2026, 8, 3, 21, 0, 0).getTime(),
      status: "confirmed",
    }, {
      onSuccess: () => {
        setSuggestionConfirmed(true);
        void persistedGoudiQuery.refetch();
        notifyPushMutation.mutate({ token: "cookie-session", title: "Goudi Adjouma confirmé", body: `${organizer.name} organise le prochain Goudi Adjouma.`, url: "/" });
      },
      onError: error => setAccountNotice(error.message),
    });
  };

  const submitRecord = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasMemberSession) return;
    const amount = Number(recordAmount);
    if (!Number.isInteger(amount) || amount <= 0) return;
    if (recordModal === "contribution") {
      const memberAccountId = Number(recordMemberId);
      if (!Number.isInteger(memberAccountId) || memberAccountId <= 0) return;
      recordContributionMutation.mutate({ token: "cookie-session", memberAccountId, period: recordPeriod, expectedAmount: 2000, paidAmount: amount, status: amount >= 2000 ? "paid" : "pending" }, {
        onSuccess: () => { setRecordModal(null); void contributionQuery.refetch(); },
        onError: error => setAccountNotice(error.message),
      });
      return;
    }
    if (recordModal === "treasury") {
      recordTreasuryMutation.mutate({ token: "cookie-session", kind: recordKind, category: recordCategory, amount, description: recordDescription || recordCategory }, {
        onSuccess: () => { setRecordModal(null); void treasuryQuery.refetch(); },
        onError: error => setAccountNotice(error.message),
      });
    }
  };

  const addMember = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim() || newMemberSecret.length < 4) return;
    registerAccountMutation.mutate({ name: newMemberName.trim(), phone: newMemberPhone.trim(), secret: newMemberSecret }, {
      onSuccess: () => {
        setNewMemberName("");
        setNewMemberPhone("");
        setNewMemberSecret("");
        setShowJoinForm(false);
        void pendingAccountsQuery.refetch();
      },
      onError: error => setAccountNotice(error.message),
    });
  };

  const requestNotifications = async () => {
    if (!hasMemberSession) {
      setAccountMode("login");
      setAccountNotice("Connectez-vous avant d’activer les notifications web.");
      setShowAccountPanel(true);
      return;
    }
    if (!("Notification" in window)) {
      setNotificationFeedback("Les notifications web ne sont pas prises en charge sur ce navigateur.");
      return;
    }
    const permission = await window.Notification.requestPermission();
    if (permission !== "granted") {
      setNotificationsEnabled(false);
      setNotificationFeedback("Les notifications restent désactivées. Vous pourrez les autoriser plus tard dans les réglages du navigateur.");
      return;
    }
    try {
      const publicKey = webPushPublicKeyQuery.data?.publicKey ?? (await webPushPublicKeyQuery.refetch()).data?.publicKey;
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Les notifications Push ne sont pas prises en charge sur cet appareil.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyToUint8Array(publicKey) });
      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys.auth) throw new Error("Impossible de finaliser l’abonnement aux notifications.");
      subscribePushMutation.mutate({ token: "cookie-session", endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth }, {
        onSuccess: () => { setNotificationsEnabled(true); setNotificationFeedback("Les rappels web sont activés pour cet appareil."); },
        onError: error => setNotificationFeedback(error.message),
      });
    } catch (error) {
      setNotificationsEnabled(false);
      setNotificationFeedback(error instanceof Error ? error.message : "Impossible d’activer les notifications web.");
    }
  };

  const submitAccount = (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountPhone.trim() || !accountSecret.trim() || (accountMode === "signup" && !accountName.trim())) return;
    if (accountMode === "signup") {
      registerAccountMutation.mutate({ name: accountName.trim(), phone: accountPhone.trim(), secret: accountSecret }, {
        onSuccess: result => {
          setAccountNotice(result.firstAdmin ? "Premier compte créé : il est administrateur et déjà approuvé. Vous pouvez maintenant vous connecter." : "Demande envoyée. Un administrateur devra valider votre compte avant votre première connexion.");
          setAccountName("");
          setAccountPhone("");
          setAccountSecret("");
          if (result.firstAdmin) setAccountMode("login");
        },
        onError: error => setAccountNotice(error.message),
      });
      return;
    }
    loginAccountMutation.mutate({ phone: accountPhone.trim(), secret: accountSecret }, {
      onSuccess: result => {
        setMemberSessionToken("cookie-session");
        setRole(result.account.role);
        setShowAccountPanel(false);
        setAccountNotice("");
      },
      onError: error => setAccountNotice(error.message),
    });
  };

  return (
    <div className="dahira-shell min-h-screen pb-24 lg:pb-0">
      <div className="mx-auto flex min-h-screen max-w-[1540px]">
        <aside className="sticky top-0 hidden h-screen w-[282px] shrink-0 flex-col bg-[#073d32] px-4 py-5 text-white lg:flex">
          <div className="mb-9 flex items-center gap-3 px-2">
            <div className="gold-ring grid h-11 w-11 place-items-center rounded-2xl bg-[#0c5a48]">
              <Crown className="h-5 w-5 text-[#f4cd79]" />
            </div>
            <div>
              <p className="display text-xl leading-none text-white">Dahira</p>
              <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.19em] text-[#e7bf66]">Manager</p>
            </div>
          </div>

          <div className="mb-3 px-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/40">Espace du Dahira</div>
          <nav className="space-y-1">
            {visibleNav.map(item => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button key={item.id} onClick={() => selectView(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${active ? "nav-active" : "text-white/67 hover:bg-white/8 hover:text-white"}`}>
                  <Icon className="h-[18px] w-[18px]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.07] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-[#f4cd79]">Notifications web</p>
              <Bell className="h-4 w-4 text-[#f4cd79]" />
            </div>
            <p className="text-xs leading-5 text-white/62">Avertissez les membres sans SMS, avec leur accord.</p>
            <button onClick={() => void requestNotifications()} className={`mt-4 w-full rounded-xl py-2 text-xs font-bold transition ${notificationsEnabled ? "bg-[#e7bf66] text-[#263b31]" : "bg-white/12 text-white"}`}>
              {notificationsEnabled ? "Notifications activées" : "Activer les alertes"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-9 lg:py-8">
          <header className="mb-6 flex items-center justify-between gap-3 lg:mb-8">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#073d32] shadow-lg">
                <Crown className="h-5 w-5 text-[#f4cd79]" />
              </div>
              <div><p className="display text-xl leading-none text-[#123e32]">Dahira</p><p className="mt-1 text-[0.58rem] font-bold tracking-[0.17em] text-[#a47b27]">MANAGER</p></div>
            </div>
            <div className="hidden lg:block"><p className="eyebrow">Dahira Al-Ihsan</p><p className="mt-1 text-sm font-semibold text-[#597065]">Jeudi 27 août 2026</p></div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden rounded-2xl border border-[#e2dac5] bg-white/80 px-3 py-2 text-xs font-bold text-[#517066] sm:block">{role === "admin" ? "Accès administrateur" : role === "treasurer" ? "Accès trésorier" : "Espace membre"}</span>
              <button onClick={() => void requestNotifications()} aria-label="Gérer les notifications" className={`relative grid h-11 w-11 place-items-center rounded-2xl border transition ${notificationsEnabled ? "border-[#e7bf66] bg-[#fff7e4] text-[#a47b27]" : "border-[#e5ddcd] bg-white text-[#174c3d]"}`}>
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#d06542]" />
              </button>
              <button onClick={() => { setAccountMode("login"); setAccountNotice(""); setShowAccountPanel(true); }} className="hidden items-center gap-2 rounded-2xl border border-[#e5ddcd] bg-white px-2.5 py-2 sm:flex"><span className="grid h-7 w-7 place-items-center rounded-xl bg-[#e6efe7] text-[10px] font-bold text-[#165743]">AD</span><ChevronDown className="h-4 w-4 text-[#73877c]" /></button>
            </div>
          </header>

          {activeDataLoading && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#e9dfcd] bg-[#fffaf0] px-4 py-3 text-sm font-medium text-[#6f7867]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0c5a48] border-t-transparent" />Mise à jour des informations du Dahira…</div>}
          {activeDataError && <div className="mb-5 rounded-2xl border border-[#f0d6cc] bg-[#fff4f0] px-4 py-3 text-sm text-[#9d513b]">Impossible de charger certaines informations. Vérifiez votre connexion puis réessayez.</div>}

          {view === "dashboard" && <Dashboard role={role} hasMemberSession={hasMemberSession} organizer={organizer} metrics={dashboardMetrics} checkInOpen={checkInOpen} notificationsEnabled={notificationsEnabled} notificationFeedback={notificationFeedback} onNavigate={selectView} onEnableNotifications={() => void requestNotifications()} />}
          {view === "members" && <MembersPage members={filteredMembers} requests={accountRequests} search={search} onSearch={setSearch} onOpenAdd={() => setShowJoinForm(true)} onSelect={setSelectedMember} onApprove={approveRequest} onReject={rejectRequest} />}
          {view === "contributions" && <ContributionsPage canManage={role !== "member"} members={members} records={contributionQuery.data} onOpenRecord={() => { setRecordModal("contribution"); setRecordMemberId(""); setRecordAmount("2000"); }} remindedMembers={remindedMembers} onRemind={name => setRemindedMembers(previous => [...previous, name])} />}
          {view === "treasury" && <TreasuryPage canManage={role !== "member"} records={treasuryQuery.data} onOpenRecord={() => { setRecordModal("treasury"); setRecordAmount(""); setRecordCategory("Cotisation"); setRecordDescription(""); setRecordKind("income"); }} />}
          {view === "goudi" && <GoudiPage role={role} members={members} history={persistedGoudiQuery.data?.events ?? []} organizer={organizer} suggestedOrganizer={members.find(member => member.id === suggestedOrganizer?.id) ?? organizer} organizerId={organizerId} setOrganizerId={setOrganizerId} suggestionConfirmed={suggestionConfirmed} setSuggestionConfirmed={setSuggestionConfirmed} notificationsEnabled={notificationsEnabled} onEnableNotifications={() => void requestNotifications()} onConfirm={confirmGoudi} />}
          {view === "attendance" && <AttendancePage members={regularMembers} checkInOpen={checkInOpen} recordCount={attendanceQuery.data?.length ?? 0} feedback={accountNotice} onCheckIn={checkIn} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6dece] bg-[#fffdf8]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_-22px_rgba(6,61,50,0.35)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {mobileNavItems.map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return <button key={item.id} onClick={() => selectView(item.id)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold ${active ? "text-[#0b5846]" : "text-[#8b9b91]"}`}><span className={`grid h-7 w-10 place-items-center rounded-xl ${active ? "bg-[#e5f1e8]" : ""}`}><Icon className="h-[18px] w-[18px]" /></span>{item.label}</button>;
          })}
          <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold text-[#8b9b91]"><span className="grid h-7 w-10 place-items-center rounded-xl"><Menu className="h-[19px] w-[19px]" /></span>Plus</button>
        </div>
      </nav>

      {isMobileMenuOpen && <div className="fixed inset-0 z-50 flex items-end bg-[#062f26]/35 p-3 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}><div className="w-full rounded-[2rem] bg-[#fffdf9] p-5 shadow-2xl" onClick={event => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Navigation</p><h3 className="mt-1 text-xl font-bold text-[#123e32]">Espace du Dahira</h3></div><button onClick={() => setIsMobileMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f0eee6]"><X className="h-5 w-5" /></button></div><div className="grid grid-cols-2 gap-3">{visibleNav.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => selectView(item.id)} className="flex items-center gap-3 rounded-2xl border border-[#eae3d6] bg-white px-3 py-3 text-left text-sm font-bold text-[#1c4b3e]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f1e8]"><Icon className="h-4 w-4" /></span>{item.label}</button>; })}</div><button onClick={() => { setAccountMode("login"); setAccountNotice(""); setShowAccountPanel(true); setIsMobileMenuOpen(false); }} className="mt-4 flex w-full items-center justify-between rounded-2xl bg-[#e8f1e8] px-4 py-3 text-sm font-bold text-[#17513f]"><span>Mon compte membre</span><ArrowUpRight className="h-4 w-4" /></button></div></div>}

      {showJoinForm && <div className="fixed inset-0 z-[60] grid place-items-center bg-[#062f26]/45 p-4"><form onSubmit={addMember} className="w-full max-w-md rounded-[2rem] bg-[#fffdf9] p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><p className="eyebrow">Nouveau compte</p><h3 className="mt-1 text-2xl font-bold text-[#123e32]">Ajouter un membre</h3><p className="mt-2 text-sm leading-5 text-[#6b8075]">Le compte sera marqué en attente de validation.</p></div><button type="button" onClick={() => setShowJoinForm(false)} className="rounded-xl bg-[#f1eee6] p-2"><X className="h-4 w-4" /></button></div><label className="mb-4 block text-sm font-bold text-[#244c40]">Nom et prénom<input required value={newMemberName} onChange={event => setNewMemberName(event.target.value)} placeholder="Ex. Khadija Ndiaye" className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium outline-none transition focus:border-[#0c5a48] focus:ring-4 focus:ring-[#dceee1]" /></label><label className="mb-4 block text-sm font-bold text-[#244c40]">Numéro de téléphone<input required value={newMemberPhone} onChange={event => setNewMemberPhone(event.target.value)} placeholder="77 000 00 00" inputMode="tel" className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium outline-none transition focus:border-[#0c5a48] focus:ring-4 focus:ring-[#dceee1]" /></label><label className="mb-6 block text-sm font-bold text-[#244c40]">Code secret initial<input required minLength={4} value={newMemberSecret} onChange={event => setNewMemberSecret(event.target.value)} placeholder="Au moins 4 caractères" type="password" className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium outline-none transition focus:border-[#0c5a48] focus:ring-4 focus:ring-[#dceee1]" /></label><button className="soft-button w-full bg-[#073d32] text-white">Enregistrer la demande <ArrowUpRight className="h-4 w-4" /></button></form></div>}
      {showAccountPanel && <div className="fixed inset-0 z-[70] grid place-items-center bg-[#062f26]/45 p-4"><form onSubmit={submitAccount} className="w-full max-w-md rounded-[2rem] bg-[#fffdf9] p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><p className="eyebrow">Espace membre</p><h3 className="mt-1 text-2xl font-bold text-[#123e32]">{accountMode === "login" ? "Bon retour parmi nous." : "Rejoindre le Dahira."}</h3><p className="mt-2 text-sm leading-5 text-[#6b8075]">{accountMode === "login" ? "Connectez-vous avec votre numéro et votre code secret." : "Votre demande sera vérifiée par un administrateur."}</p></div><button type="button" onClick={() => setShowAccountPanel(false)} className="rounded-xl bg-[#f1eee6] p-2"><X className="h-4 w-4" /></button></div><div className="mb-5 grid grid-cols-2 rounded-2xl bg-[#f1eee6] p-1"><button type="button" onClick={() => { setAccountMode("login"); setAccountNotice(""); }} className={`rounded-xl py-2.5 text-xs font-bold ${accountMode === "login" ? "bg-white text-[#073d32] shadow-sm" : "text-[#738378]"}`}>Connexion</button><button type="button" onClick={() => { setAccountMode("signup"); setAccountNotice(""); }} className={`rounded-xl py-2.5 text-xs font-bold ${accountMode === "signup" ? "bg-white text-[#073d32] shadow-sm" : "text-[#738378]"}`}>Inscription</button></div>{accountMode === "signup" && <label className="mb-4 block text-sm font-bold text-[#244c40]">Nom et prénom<input required value={accountName} onChange={event => setAccountName(event.target.value)} placeholder="Ex. Khadija Ndiaye" className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium outline-none transition focus:border-[#0c5a48] focus:ring-4 focus:ring-[#dceee1]" /></label>}<label className="mb-4 block text-sm font-bold text-[#244c40]">Numéro de téléphone<input required value={accountPhone} onChange={event => setAccountPhone(event.target.value)} placeholder="77 000 00 00" inputMode="tel" className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium outline-none transition focus:border-[#0c5a48] focus:ring-4 focus:ring-[#dceee1]" /></label><label className="mb-5 block text-sm font-bold text-[#244c40]">Code secret<input required minLength={4} value={accountSecret} onChange={event => setAccountSecret(event.target.value)} placeholder="Au moins 4 caractères" type="password" className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium outline-none transition focus:border-[#0c5a48] focus:ring-4 focus:ring-[#dceee1]" /></label>{accountNotice && <p className="mb-5 rounded-2xl bg-[#e8f3e9] p-3 text-sm leading-5 text-[#2e7047]">{accountNotice}</p>}<button className="soft-button w-full bg-[#073d32] text-white">{accountMode === "login" ? "Accéder à mon espace" : "Envoyer ma demande"}<ArrowUpRight className="h-4 w-4" /></button><p className="mt-4 text-center text-[11px] leading-4 text-[#829188]">Aucun SMS n’est envoyé. Votre numéro sert uniquement d’identifiant après validation.</p></form></div>}
      {recordModal && <div className="fixed inset-0 z-[75] grid place-items-center bg-[#062f26]/45 p-4"><form onSubmit={submitRecord} className="w-full max-w-md rounded-[2rem] bg-[#fffdf9] p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><p className="eyebrow">Saisie sécurisée</p><h3 className="mt-1 text-2xl font-bold text-[#123e32]">{recordModal === "contribution" ? "Enregistrer une cotisation" : "Ajouter un mouvement"}</h3></div><button type="button" onClick={() => setRecordModal(null)} className="rounded-xl bg-[#f1eee6] p-2"><X className="h-4 w-4" /></button></div>{recordModal === "contribution" ? <><label className="mb-4 block text-sm font-bold text-[#244c40]">Membre<select required value={recordMemberId} onChange={event => setRecordMemberId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-3 text-sm font-medium"><option value="">Sélectionner un membre</option>{members.filter(member => member.id.startsWith("member-")).map(member => <option key={member.id} value={member.id.replace("member-", "")}>{member.name}</option>)}</select></label><label className="mb-4 block text-sm font-bold text-[#244c40]">Période<input required value={recordPeriod} onChange={event => setRecordPeriod(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium" /></label></> : <><label className="mb-4 block text-sm font-bold text-[#244c40]">Type<select value={recordKind} onChange={event => setRecordKind(event.target.value as "income" | "expense")} className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-3 text-sm font-medium"><option value="income">Entrée</option><option value="expense">Dépense</option></select></label><label className="mb-4 block text-sm font-bold text-[#244c40]">Catégorie<input required value={recordCategory} onChange={event => setRecordCategory(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium" /></label><label className="mb-4 block text-sm font-bold text-[#244c40]">Description<input value={recordDescription} onChange={event => setRecordDescription(event.target.value)} placeholder="Ex. collecte du jeudi" className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium" /></label></>}<label className="mb-6 block text-sm font-bold text-[#244c40]">Montant (F CFA)<input required min="1" value={recordAmount} onChange={event => setRecordAmount(event.target.value)} inputMode="numeric" className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-4 text-sm font-medium" /></label><button className="soft-button w-full bg-[#073d32] text-white">Enregistrer<Check className="h-4 w-4" /></button>{accountNotice && <p className="mt-4 text-sm text-[#ae593d]">{accountNotice}</p>}</form></div>}
      {selectedMember && <MemberDetail member={selectedMember} canManage={role === "admin"} contributionRecords={contributionQuery.data ?? []} attendanceRecords={attendanceQuery.data ?? []} goudiRecords={persistedGoudiQuery.data?.events ?? []} onRoleChange={updateMemberRole} onClose={() => setSelectedMember(null)} />}
    </div>
  );
}

function Dashboard({ role, hasMemberSession, organizer, metrics, checkInOpen, notificationsEnabled, notificationFeedback, onNavigate, onEnableNotifications }: { role: AppRole; hasMemberSession: boolean; organizer: Member; metrics: { memberCount: number; received: number; expected: number; treasury: number; attendanceCount: number; paidCount: number; pendingCount: number; lateCount: number }; checkInOpen: boolean; notificationsEnabled: boolean; notificationFeedback: string; onNavigate: (view: View) => void; onEnableNotifications: () => void }) {
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Bonjour, Abdou</p><h1 className="display mt-1 text-3xl tracking-tight text-[#123e32] sm:text-4xl">Le Dahira en un regard.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#647a6f]">Suivez les activités, les cotisations et l’organisation du prochain Goudi simplement.</p></div><button onClick={() => onNavigate("goudi")} className="soft-button w-fit bg-[#073d32] text-white shadow-[0_12px_20px_-15px_rgba(7,61,50,0.7)]">Préparer jeudi prochain <ArrowUpRight className="h-4 w-4" /></button></div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Users} label="Membres actifs" value={String(metrics.memberCount)} note="comptes approuvés" tone="green" />
      <Metric icon={CircleDollarSign} label="Cotisations reçues" value={money(metrics.received)} note={`sur ${money(metrics.expected)} attendus`} tone="gold" />
      <Metric icon={WalletCards} label="Solde de caisse" value={money(metrics.treasury)} note="mouvements enregistrés" tone="green" />
      <Metric icon={UserCheck} label="Participation" value={String(metrics.attendanceCount)} note="pointage(s) enregistré(s)" tone="terracotta" />
    </div>
    {!hasMemberSession && <div className="mt-4 rounded-2xl border border-[#e6dcc7] bg-[#fffaf0] p-4 text-sm leading-6 text-[#6f776c]">Connectez-vous avec votre numéro et votre code secret pour afficher les données réelles de votre Dahira. Le premier compte inscrit devient administrateur.</div>}

    <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="surface-card overflow-hidden">
        <div className="relative bg-[#073d32] px-5 pb-7 pt-5 text-white sm:px-6"><div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[#0c5a48] blur-2xl" /><div className="relative flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[#e6c36d]">Prochain Goudi Adjouma</p><h2 className="display mt-2 text-2xl">Jeudi 3 septembre</h2></div><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/12"><CalendarClock className="h-5 w-5 text-[#f4cd79]" /></span></div></div>
        <div className="p-5 sm:p-6"><div className="flex items-center gap-3"><Avatar member={organizer} size="lg" /><div><p className="font-bold text-[#164536]">{organizer.name}</p><p className="mt-1 text-sm text-[#718278]">Organisateur proposé · Rotation #{organizer.rotation}</p></div><span className="ml-auto rounded-full bg-[#eaf2e8] px-2.5 py-1 text-[11px] font-bold text-[#247043]">À confirmer</span></div><div className="my-5 grid grid-cols-2 gap-3"><InfoMini label="Contribution" value={money(10000)} icon={CircleDollarSign} /><InfoMini label="Rappel" value="Mardi à 18 h" icon={Bell} /></div><button onClick={() => onNavigate("goudi")} className="soft-button w-full border border-[#dbe6db] bg-[#f9fcf8] text-[#0c5a48]">Voir et confirmer l’organisation <ArrowUpRight className="h-4 w-4" /></button></div>
      </section>

      <section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="Cotisations" title="État enregistré" action={<button onClick={() => onNavigate("contributions")} className="text-xs font-bold text-[#0c5a48]">Tout voir</button>} /><div className="mb-5 h-3 overflow-hidden rounded-full bg-[#f0ede4]"><div className="h-full rounded-full bg-[#0c5a48]" style={{ width: `${metrics.expected ? Math.min(100, Math.round(metrics.received / metrics.expected * 100)) : 0}%` }} /></div><div className="grid grid-cols-3 gap-2 text-center"><div><p className="text-lg font-bold text-[#174b3d]">{metrics.paidCount}</p><p className="mt-1 text-[11px] font-bold text-[#6e8378]">À jour</p></div><div className="border-x border-[#eee8dd]"><p className="text-lg font-bold text-[#b17823]">{metrics.pendingCount}</p><p className="mt-1 text-[11px] font-bold text-[#6e8378]">En attente</p></div><div><p className="text-lg font-bold text-[#bd5c3c]">{metrics.lateCount}</p><p className="mt-1 text-[11px] font-bold text-[#6e8378]">En retard</p></div></div><div className="mt-5 rounded-2xl bg-[#f8f3e7] p-3.5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5cc8d]/45"><Sparkles className="h-4 w-4 text-[#a07729]" /></span><p className="text-xs leading-5 text-[#5b685f]"><b className="text-[#315044]">Conseil :</b> les relances concernent uniquement les cotisations en attente ou en retard.</p></div></div></section>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="Présences" title="Pointage du jeudi" /><div className={`rounded-3xl border p-4 ${checkInOpen ? "border-[#bbd9c2] bg-[#edf8ef]" : "border-[#eadfca] bg-[#fffaf0]"}`}><div className="flex items-start gap-3"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${checkInOpen ? "bg-[#d8edda] text-[#1e7442]" : "bg-[#f8e9c5] text-[#a56f15]"}`}>{checkInOpen ? <Check className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}</span><div><p className="font-bold text-[#1a4b3d]">{checkInOpen ? "Le pointage est ouvert" : "Le pointage ouvre jeudi à 21 h"}</p><p className="mt-1 text-sm leading-5 text-[#698075]">Facultatif · accessible jusqu’à 23 h 59 · sans conséquence pour les absents.</p></div></div><button onClick={() => onNavigate("attendance")} className={`soft-button mt-4 w-full ${checkInOpen ? "bg-[#0c5a48] text-white" : "bg-white text-[#577167] ring-1 ring-[#e8deca]"}`}>{checkInOpen ? "Pointer ma présence" : "Voir les régularités"}</button></div></section>
      <section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="Communication" title="Rester informé" /><div className="flex items-center justify-between gap-4 rounded-3xl bg-[#f0f7f1] p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#0c5a48] shadow-sm"><Bell className="h-5 w-5" /></span><div><p className="font-bold text-[#1c4c3e]">Notifications web</p><p className="mt-1 text-sm leading-5 text-[#698075]">Rappels de Goudi et informations utiles, sans SMS.</p></div></div><button onClick={onEnableNotifications} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${notificationsEnabled ? "bg-[#0c5a48] text-white" : "bg-white text-[#0c5a48] shadow-sm"}`}>{notificationsEnabled ? "Activées" : "Activer"}</button></div>{notificationFeedback && <p className="mt-3 rounded-2xl bg-[#f8f4e8] px-3 py-2 text-xs leading-5 text-[#6e755f]">{notificationFeedback}</p>}<div className="mt-4 flex items-center gap-3 text-xs text-[#75877e]"><ShieldCheck className="h-4 w-4 text-[#0c5a48]" />Les membres décident eux-mêmes d’accepter les alertes.</div></section>
    </div>
  </div>;
}

function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof Users; label: string; value: string; note: string; tone: "green" | "gold" | "terracotta" }) {
  const tones = { green: "bg-[#e4f0e7] text-[#146045]", gold: "bg-[#fbf0d8] text-[#9b6d1d]", terracotta: "bg-[#fae7e1] text-[#b85c3d]" };
  return <div className="surface-card p-4 sm:p-5"><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span><Ellipsis className="h-4 w-4 text-[#a4b0a8]" /></div><p className="mt-5 text-[11px] font-bold uppercase tracking-[0.09em] text-[#75877e]">{label}</p><p className="mt-1.5 text-2xl font-bold tracking-tight text-[#173f33]">{value}</p><p className="mt-1 text-xs text-[#82938a]">{note}</p></div>;
}

function InfoMini({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Bell }) {
  return <div className="rounded-2xl bg-[#f5f5ef] p-3"><div className="flex items-center gap-1.5 text-[#819087]"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</span></div><p className="mt-2 text-sm font-bold text-[#1c4d3e]">{value}</p></div>;
}

function MembersPage({ members, requests, search, onSearch, onOpenAdd, onSelect, onApprove, onReject }: { members: Member[]; requests: AccountRequest[]; search: string; onSearch: (value: string) => void; onOpenAdd: () => void; onSelect: (member: Member) => void; onApprove: (request: AccountRequest) => void; onReject: (id: number) => void }) {
  const pendingRequests = requests.filter(request => request.status === "En attente");
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PageIntro eyebrow="Gestion des membres" title="Une communauté bien organisée." description="Gardez les informations essentielles et la situation de chaque membre à portée de main." action={<button onClick={onOpenAdd} className="soft-button bg-[#073d32] text-white"><UserPlus className="h-4 w-4" />Ajouter un membre</button>} />
      {pendingRequests.length > 0 && <section className="mb-5 rounded-[2rem] border border-[#e9d6a7] bg-[#fff9ea] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Validation administrateur</p><h2 className="mt-1 text-lg font-bold text-[#604e20]">{pendingRequests.length} demande{pendingRequests.length > 1 ? "s" : ""} en attente</h2></div><UserCog className="h-5 w-5 text-[#a07a28]" /></div><div className="space-y-2">{pendingRequests.map(request => <div key={request.id} className="flex flex-col gap-3 rounded-2xl bg-white/80 p-3 sm:flex-row sm:items-center"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f5e5bb] text-xs font-bold text-[#87661e]">{request.name.split(" ").slice(0, 2).map(part => part[0]).join("")}</span><div className="min-w-0 flex-1"><p className="font-bold text-[#3d512a]">{request.name}</p><p className="mt-1 text-xs text-[#8c8060]">{request.phone} · {request.requestedAt}</p></div><div className="flex gap-2"><button onClick={() => onApprove(request)} className="rounded-xl bg-[#0c5a48] px-3 py-2 text-xs font-bold text-white">Valider</button><button onClick={() => onReject(request.id)} className="rounded-xl bg-[#f4eee0] px-3 py-2 text-xs font-bold text-[#857553]">Refuser</button></div></div>)}</div></section>}
      <section className="surface-card overflow-hidden"><div className="flex flex-col gap-3 border-b border-[#eee7da] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#84948a]" /><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Rechercher un membre" className="h-11 w-full rounded-xl border border-[#e8e0d2] bg-[#fffefa] pl-10 pr-3 text-sm font-medium outline-none focus:border-[#0c5a48] focus:ring-4 focus:ring-[#dceee1]" /></div><p className="text-xs font-semibold text-[#708177]">{members.length} membres affichés</p></div><div className="divide-y divide-[#eee7da]">{members.map(member => <button key={member.id} onClick={() => onSelect(member)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[#fbfaf5] sm:px-5"><Avatar member={member} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#164536]">{member.name}</p><p className="mt-1 truncate text-xs text-[#78887f]">{member.responsibility} · {member.phone}</p></div><div className="hidden text-right sm:block"><p className="text-xs font-bold text-[#385a4f]">{member.attendance}</p><p className="mt-1 text-[11px] text-[#84938b]">Présences</p></div><StatusPill status={member.status} /><span className="rounded-xl p-2 text-[#779087]"><MoreHorizontal className="h-4 w-4" /></span></button>)}</div></section>
    </div>
  );
}

function ContributionsPage({ canManage, members, records, onOpenRecord, remindedMembers, onRemind }: { canManage: boolean; members: Member[]; records?: { id: number; memberAccountId: number; period: string; expectedAmount: number; paidAmount: number; status: "paid" | "pending" | "late" }[]; onOpenRecord: () => void; remindedMembers: string[]; onRemind: (name: string) => void }) {
  const rows = records?.map(record => ({ ...record, member: members.find(item => item.id === `member-${record.memberAccountId}`), state: record.status === "paid" ? "À jour" as MemberStatus : record.status === "late" ? "En retard" as MemberStatus : "En attente" as MemberStatus })) ?? [];
  const received = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const remaining = rows.reduce((sum, row) => sum + Math.max(row.expectedAmount - row.paidAmount, 0), 0);
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><PageIntro eyebrow="Cotisations" title="Suivre chaque participation." description="Visualisez les paiements attendus, les régularisations et les montants restant à recevoir." action={canManage ? <button onClick={onOpenRecord} className="soft-button bg-[#073d32] text-white"><Plus className="h-4 w-4" />Enregistrer un paiement</button> : undefined} /><div className="mb-5 grid gap-3 sm:grid-cols-3"><MiniReport icon={ArrowDownLeft} label="Encaissé ce mois" value={money(received)} color="green" /><MiniReport icon={Clock3} label="Restant à recevoir" value={money(remaining)} color="gold" /><MiniReport icon={Send} label="Relances à faire" value={`${rows.filter(row => row.state !== "À jour").length} membre(s)`} color="terracotta" /></div><section className="surface-card overflow-hidden"><div className="border-b border-[#eee7da] p-5"><p className="font-bold text-[#1b4b3d]">Situation des membres</p><p className="mt-1 text-sm text-[#75877e]">Cotisation mensuelle configurée par l’administrateur.</p></div>{records === undefined ? <div className="p-8 text-center text-sm text-[#78887f]">Connectez-vous pour consulter les cotisations.</div> : rows.length === 0 ? <div className="p-8 text-center"><ReceiptText className="mx-auto h-8 w-8 text-[#b4c2b8]" /><p className="mt-3 font-bold text-[#38594e]">Aucune cotisation enregistrée</p><p className="mt-1 text-sm text-[#7c8d84]">Les paiements enregistrés apparaîtront ici.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-[#faf8f2] text-[11px] uppercase tracking-[0.08em] text-[#829188]"><tr><th className="px-5 py-3 font-bold">Membre</th><th className="px-4 py-3 font-bold">Période</th><th className="px-4 py-3 font-bold">Attendu</th><th className="px-4 py-3 font-bold">Payé</th><th className="px-5 py-3 font-bold">Situation</th><th className="px-5 py-3 font-bold">Action</th></tr></thead><tbody className="divide-y divide-[#eee7da]">{rows.map(row => <tr key={row.id} className="text-sm"><td className="px-5 py-4 font-bold text-[#1b4b3d]">{row.member?.name ?? "Membre"}</td><td className="px-4 py-4 text-[#536d62]">{row.period}</td><td className="px-4 py-4">{money(row.expectedAmount)}</td><td className="px-4 py-4">{money(row.paidAmount)}</td><td className="px-5 py-4"><StatusPill status={row.state} /></td><td className="px-5 py-4">{canManage && row.state !== "À jour" ? <button onClick={() => onRemind(row.member?.name ?? "Membre")} className={`rounded-xl px-3 py-2 text-xs font-bold ${remindedMembers.includes(row.member?.name ?? "Membre") ? "bg-[#e5f2e7] text-[#267044]" : "bg-[#f9f0da] text-[#966819]"}`}>{remindedMembers.includes(row.member?.name ?? "Membre") ? "Relance prête" : "Relancer"}</button> : <span className="text-xs text-[#8b9891]">—</span>}</td></tr>)}</tbody></table></div>}</section></div>;
}

function TreasuryPage({ canManage, records, onOpenRecord }: { canManage: boolean; records?: { id: number; kind: "income" | "expense"; category: string; amount: number; description: string; occurredAt: Date }[]; onOpenRecord: () => void }) {
  const transactions = records?.map(record => ({ label: record.description, category: record.category, amount: record.kind === "income" ? record.amount : -record.amount, date: new Date(record.occurredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) })) ?? [];
  const balance = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><PageIntro eyebrow="Caisse du Dahira" title="Une gestion claire et sereine." description="Consultez le solde, les entrées et les dépenses dans un même espace." action={canManage ? <button onClick={onOpenRecord} className="soft-button bg-[#073d32] text-white"><Plus className="h-4 w-4" />Ajouter un mouvement</button> : undefined} /><section className="overflow-hidden rounded-[2rem] bg-[#073d32] p-5 text-white sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#eccd7d]">Solde disponible</p><p className="display mt-3 text-4xl sm:text-5xl">{money(balance)}</p><p className="mt-3 text-sm text-white/64">Calculé à partir des mouvements enregistrés.</p></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><Landmark className="h-6 w-6 text-[#f2ca73]" /></span></div></section><section className="surface-card mt-5 overflow-hidden"><SectionHeading title="Derniers mouvements" />{records === undefined ? <div className="px-5 pb-6 text-sm text-[#78887f]">Connectez-vous avec un compte trésorier ou administrateur.</div> : transactions.length === 0 ? <div className="px-5 pb-7 text-center"><WalletCards className="mx-auto h-8 w-8 text-[#b4c2b8]" /><p className="mt-3 font-bold text-[#38594e]">Aucun mouvement de caisse</p><p className="mt-1 text-sm text-[#7c8d84]">Les entrées et dépenses apparaîtront ici.</p></div> : <div className="divide-y divide-[#eee7da] px-5 pb-1">{transactions.map(transaction => <div key={`${transaction.label}-${transaction.date}`} className="flex items-center gap-3 py-4"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${transaction.amount > 0 ? "bg-[#e7f3e9] text-[#287146]" : "bg-[#fae8e1] text-[#bd5d3c]"}`}>{transaction.amount > 0 ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#1b4b3d]">{transaction.label}</p><p className="mt-1 text-xs text-[#7e8d85]">{transaction.category} · {transaction.date}</p></div><p className={`text-sm font-bold ${transaction.amount > 0 ? "text-[#267244]" : "text-[#bc5b39]"}`}>{transaction.amount > 0 ? "+" : ""}{money(transaction.amount)}</p></div>)}</div>}</section></div>;
}

function GoudiPage({ role, members, history, organizer, suggestedOrganizer, organizerId, setOrganizerId, suggestionConfirmed, setSuggestionConfirmed, notificationsEnabled, onEnableNotifications, onConfirm }: { role: AppRole; members: Member[]; history: { id: number; organizerAccountId: number | null; scheduledFor: Date; status: "proposed" | "confirmed" | "completed" }[]; organizer: Member; suggestedOrganizer: Member; organizerId: string; setOrganizerId: (id: string) => void; suggestionConfirmed: boolean; setSuggestionConfirmed: (value: boolean) => void; notificationsEnabled: boolean; onEnableNotifications: () => void; onConfirm: () => void }) {
  const canManageGoudi = role === "admin";
  const isAutomaticSuggestion = organizer.id === suggestedOrganizer.id;
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><PageIntro eyebrow="Goudi Adjouma" title="Préparer jeudi prochain avec sérénité." description="L’application propose une rotation juste ; l’administrateur garde toujours le dernier mot." /><div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><section className="surface-card overflow-hidden"><div className="bg-[#073d32] p-5 text-white sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#efcf7d]">Proposition pour jeudi 3 septembre</p><h2 className="display mt-2 text-3xl">{organizer.name}</h2><p className="mt-2 text-sm text-white/66">{isAutomaticSuggestion ? `Suggestion automatique · rotation #${organizer.rotation}` : `Choix manuel · suggestion initiale : ${suggestedOrganizer.name}`}</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><Sparkles className="h-5 w-5 text-[#f4cd79]" /></span></div></div><div className="p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><Avatar member={organizer} size="lg" /><div><p className="font-bold text-[#1b4a3c]">{organizer.phone}</p><p className="mt-1 text-sm text-[#75877e]">Contribution prévue : <b className="text-[#1b4a3c]">10 000 F</b></p></div></div>{canManageGoudi ? <label className="block text-sm font-bold text-[#264d41]">Modifier l’organisateur<select value={organizerId || suggestedOrganizer.id} onChange={event => { setOrganizerId(event.target.value); setSuggestionConfirmed(false); }} className="mt-2 h-12 w-full rounded-xl border border-[#e5ddcd] bg-white px-3 text-sm font-semibold text-[#264d41] outline-none focus:border-[#0c5a48] focus:ring-4 focus:ring-[#dceee1]">{members.map(member => <option value={member.id} key={member.id}>{member.name} — rotation #{member.rotation}</option>)}</select></label> : <div className="rounded-2xl bg-[#f4f5ef] p-4 text-sm leading-6 text-[#688077]">Seul l’administrateur peut confirmer ou modifier l’organisateur.</div>} {canManageGoudi && <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={onConfirm} className={`soft-button ${suggestionConfirmed ? "bg-[#e2f0e5] text-[#247044]" : "bg-[#073d32] text-white"}`}>{suggestionConfirmed ? <><Check className="h-4 w-4" />Organisateur confirmé</> : "Confirmer le choix"}</button><button onClick={onEnableNotifications} className="soft-button border border-[#dfd9cc] bg-white text-[#0c5a48]"><Send className="h-4 w-4" />{notificationsEnabled ? "Rappel prêt" : "Préparer le rappel"}</button></div>}</div></section><section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="Historique" title="Derniers organisateurs" /><div className="space-y-4">{history.length === 0 ? <p className="rounded-2xl bg-[#fbfaf5] p-4 text-sm text-[#7b8c82]">Aucun Goudi enregistré pour le moment.</p> : history.slice().sort((a, b) => +new Date(b.scheduledFor) - +new Date(a.scheduledFor)).map(entry => { const member = members.find(item => item.id === `member-${entry.organizerAccountId}`); if (!member) return null; return <div key={entry.id} className="flex items-center gap-3"><Avatar member={member} size="sm" /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#214b3d]">{member.name}</p><p className="mt-1 text-xs text-[#7b8c82]">{new Date(entry.scheduledFor).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p></div><span className="rounded-full bg-[#edf4ed] px-2.5 py-1 text-[10px] font-bold text-[#397650]">{entry.status === "confirmed" ? "Confirmé" : entry.status === "completed" ? "Terminé" : "Proposé"}</span></div>; })}</div><div className="mt-6 rounded-2xl bg-[#fbf4e4] p-4"><p className="text-sm font-bold text-[#76591f]">Une rotation équitable</p><p className="mt-1 text-xs leading-5 text-[#8b7445]">La suggestion suit les membres actifs et le dernier organisateur confirmé. À la fin de la liste, elle reprend au premier membre actif.</p></div></section></div></div>;
}

function AttendancePage({ members, checkInOpen, recordCount, feedback, onCheckIn }: { members: Member[]; checkInOpen: boolean; recordCount: number; feedback: string; onCheckIn: () => void }) {
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><PageIntro eyebrow="Présences" title="Observer la régularité, sans obligation." description="Le pointage du jeudi est volontaire. Il aide le Dahira à mieux connaître la participation de ses membres." /><section className={`rounded-[2rem] border p-5 sm:p-6 ${checkInOpen ? "border-[#b9ddc1] bg-[#eff9f0]" : "border-[#e9dec8] bg-[#fffaf0]"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${checkInOpen ? "bg-[#d7efd9] text-[#247143]" : "bg-[#fae8c2] text-[#9e6c18]"}`}>{checkInOpen ? <Check className="h-6 w-6" /> : <Clock3 className="h-6 w-6" />}</span><div><p className="text-lg font-bold text-[#1c4c3e]">{checkInOpen ? "Pointage ouvert maintenant" : "Pointage réservé au jeudi"}</p><p className="mt-1 text-sm text-[#687e73]">Disponible de 21 h à 23 h 59 · le membre peut pointer ou simplement participer sans se signaler.</p></div></div><button onClick={onCheckIn} disabled={!checkInOpen} className={`soft-button ${checkInOpen ? "bg-[#073d32] text-white" : "cursor-not-allowed bg-white/75 text-[#809087] ring-1 ring-[#e8deca]"}`}>{checkInOpen ? "Pointer ma présence" : "Ouvre jeudi à 21 h"}</button></div>{feedback && <p className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-sm text-[#5f746a]">{feedback}</p>}</section><div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]"><section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="Indicateurs" title="Participation récente" /><div className="space-y-5"><Progress label="Pointages enregistrés" value={`${recordCount} présence${recordCount > 1 ? "s" : ""}`} percent={Math.min(recordCount * 10, 100)} color="#0c5a48" /><Progress label="Moyenne sur 4 jeudis" value="84 %" percent={84} color="#ba7d1d" /><Progress label="Réguliers (3+ présences)" value="24 membres" percent={63} color="#4a8c69" /></div></section><section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="Régularité" title="Membres les plus présents" /><div className="space-y-3">{members.map((member, index) => <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-[#fbfaf5] p-3"><span className="grid h-7 w-7 place-items-center rounded-xl bg-[#f5e7be] text-xs font-bold text-[#8d651d]">{index + 1}</span><Avatar member={member} size="sm" /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#214b3d]">{member.name}</p><p className="mt-1 text-xs text-[#7d8d84]">{member.attendance} jeudis</p></div><span className="text-sm font-bold text-[#1f6e46]">{Math.round(Number(member.attendance.split(" ")[0]) / 20 * 100)} %</span></div>)}</div><p className="mt-5 text-xs leading-5 text-[#809087]">Cette information est un repère pour l’organisation, jamais une sanction ou une obligation.</p></section></div></div>;
}

function MemberDetail({ member, canManage, contributionRecords, attendanceRecords, goudiRecords, onRoleChange, onClose }: { member: Member; canManage: boolean; contributionRecords: { id: number; memberAccountId: number; period: string; paidAmount: number; status: "paid" | "pending" | "late" }[]; attendanceRecords: { id: number; memberAccountId: number; eventDate: Date; checkedInAt: Date }[]; goudiRecords: { id: number; organizerAccountId: number | null; scheduledFor: Date; status: "proposed" | "confirmed" | "completed" }[]; onRoleChange: (memberId: string, nextRole: Member["role"]) => void; onClose: () => void }) {
  const accountId = Number(member.id.replace("member-", ""));
  const goudiEntries = goudiRecords.filter(entry => entry.organizerAccountId === accountId);
  const attendanceHistory = attendanceRecords.filter(entry => entry.memberAccountId === accountId).map(entry => ({ date: new Date(entry.eventDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), status: "Présence enregistrée", time: new Date(entry.checkedInAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }));
  const contributionHistory = contributionRecords.filter(entry => entry.memberAccountId === accountId).map(entry => ({ period: entry.period, amount: money(entry.paidAmount), status: entry.status === "paid" ? "À jour" as MemberStatus : entry.status === "late" ? "En retard" as MemberStatus : "En attente" as MemberStatus }));
  return <div className="fixed inset-0 z-[80] grid place-items-end bg-[#062f26]/45 sm:place-items-center sm:p-4"><section className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#fffdf9] p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><Avatar member={member} size="lg" /><div><p className="text-xl font-bold text-[#143f32]">{member.name}</p><p className="mt-1 text-sm text-[#72847a]">{member.role} · {member.responsibility}</p></div></div><button onClick={onClose} className="rounded-xl bg-[#f1eee6] p-2"><X className="h-4 w-4" /></button></div><div className="mt-6 grid grid-cols-2 gap-3"><InfoMini label="Téléphone" value={member.phone} icon={Users} /><InfoMini label="Présences" value={member.attendance} icon={CalendarCheck2} /></div>{canManage && <label className="mt-5 block text-sm font-bold text-[#264d41]">Rôle dans le Dahira<select value={member.role} onChange={event => onRoleChange(member.id, event.target.value as Member["role"])} className="mt-2 h-11 w-full rounded-xl border border-[#e5ddcd] bg-white px-3 text-sm font-semibold text-[#264d41] outline-none focus:border-[#0c5a48] focus:ring-4 focus:ring-[#dceee1]"><option>Administrateur</option><option>Trésorier</option><option>Membre</option></select></label>}<div className="mt-5 rounded-2xl bg-[#f8f4e8] p-4"><p className="text-sm font-bold text-[#5f552d]">Cotisations</p><div className="mt-3 space-y-2">{contributionHistory.map(entry => <div key={entry.period} className="flex items-center justify-between text-sm"><span className="text-[#7f744b]">{entry.period}</span><span className="flex items-center gap-2 font-bold text-[#5f552d]">{entry.amount}<StatusPill status={entry.status} /></span></div>)}</div></div><div className="mt-4 rounded-2xl bg-[#edf5ec] p-4"><p className="text-sm font-bold text-[#2c6542]">Goudi Adjouma</p>{goudiEntries.length > 0 ? <div className="mt-3 space-y-2">{goudiEntries.map(entry => <p key={entry.id} className="text-sm text-[#5d7f66]">Organisateur · {new Date(entry.scheduledFor).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>)}</div> : <p className="mt-1 text-sm leading-5 text-[#5d7f66]">Aucune organisation enregistrée pour le moment.</p>}</div><div className="mt-6"><SectionHeading eyebrow="Historique" title="Derniers pointages" /><div className="space-y-3">{attendanceHistory.map(entry => <div key={entry.date} className="flex items-center gap-3 rounded-2xl border border-[#eee7da] px-3 py-3"><span className={`h-2.5 w-2.5 rounded-full ${entry.status === "Présence enregistrée" ? "bg-[#3c8b57]" : "bg-[#d5a85a]"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#2a5145]">{entry.date}</p><p className="mt-1 text-xs text-[#809087]">{entry.status}</p></div><span className="text-xs font-bold text-[#61776d]">{entry.time}</span></div>)}</div></div><button onClick={onClose} className="soft-button mt-6 w-full bg-[#073d32] text-white">Fermer la fiche</button></section></div>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{eyebrow}</p><h1 className="display mt-1 text-3xl tracking-tight text-[#123e32] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#687d72]">{description}</p></div>{action}</div>;
}

function MiniReport({ icon: Icon, label, value, color }: { icon: typeof ArrowDownLeft; label: string; value: string; color: "green" | "gold" | "terracotta" }) {
  const colors = { green: "bg-[#e5f2e7] text-[#247044]", gold: "bg-[#faefd6] text-[#996b19]", terracotta: "bg-[#f9e6df] text-[#ba5e3d]" };
  return <div className="surface-card flex items-center gap-3 p-4"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${colors[color]}`}><Icon className="h-5 w-5" /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#829188]">{label}</p><p className="mt-1 text-lg font-bold text-[#1a493b]">{value}</p></div></div>;
}

function Progress({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return <div><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-[#38594e]">{label}</span><span className="font-bold text-[#1d4b3c]">{value}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-[#eeede5]"><div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} /></div></div>;
}
