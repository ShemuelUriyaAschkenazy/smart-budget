import { getAccounts, getMonthlyAccountsChecklist } from '../actions/account-actions';
import AccountsClient from './AccountsClient';

export default async function AccountsPage() {
  const defaultMonth = new Date().toISOString().slice(0, 7);

  // שליפת הנתונים מתבצעת בשרת בלבד במקביל!
  const [accounts, checklist] = await Promise.all([
    getAccounts(false),
    getMonthlyAccountsChecklist(defaultMonth),
  ]);

  return (
    <AccountsClient
      initialAccounts={accounts}
      initialChecklist={checklist}
      initialMonth={defaultMonth}
    />
  );
}