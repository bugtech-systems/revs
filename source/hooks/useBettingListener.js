import { useEffect } from 'react';
import { realmContext } from '../RealmContext';
import { Betting } from '../Models';

const { useRealm, useQuery } = realmContext;

export const useBettingListener = (onChange: (updatedBettings: Realm.Results<Betting>) => void) => {
  const realm = useRealm();
  const bettings = useQuery(Betting);

  useEffect(() => {
    const listener = (collection, changes) => {
      // Notify parent of updated collection
      onChange(collection);

      // Optional: Log changes
      if (changes.insertions.length > 0) {
        console.log('🟢 New betting(s) added at index:', changes.insertions);
      }

      if (changes.modifications.length > 0) {
        console.log('🟡 Betting(s) modified at index:', changes.modifications);
      }

      if (changes.deletions.length > 0) {
        console.log('🔴 Betting(s) deleted at index:', changes.deletions);
      }
    };

    // Attach listener
    bettings.addListener(listener);

    return () => {
      // Detach listener when component unmounts
      bettings.removeListener(listener);
    };
  }, [realm, bettings, onChange]);
};
