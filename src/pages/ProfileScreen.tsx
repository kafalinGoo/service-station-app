import { useState, useEffect } from "react";
import { API, AuthUser, UserCar, Screen, loadUserCars, saveUserCars, fetchUserCars, addUserCar, deleteUserCar } from "./appTypes";
import { ProfileHeader } from "./profile/ProfileHeader";
import { MasterStation } from "./profile/MasterStation";
import { ClientCars } from "./profile/ClientCars";
import { ProfileSettings } from "./profile/ProfileSettings";

export function ProfileScreen({ user, onLogout, setScreen }: { user: AuthUser; onLogout: () => void; setScreen: (s: Screen) => void }) {
  const [cars, setCars] = useState<UserCar[]>(() => loadUserCars());

  useEffect(() => {
    if (user.role === "master" || !user.id) return;
    fetchUserCars(user.id).then(fetched => {
      if (fetched.length) { setCars(fetched); saveUserCars(fetched); }
    }).catch(() => {});
  }, [user.id]);

  const [masterStation, setMasterStation] = useState("");
  const [masterSpecialties, setMasterSpecialties] = useState<string[]>([]);
  const [masterAddress, setMasterAddress] = useState("");
  const [masterCity, setMasterCity] = useState("");
  const [masterRating, setMasterRating] = useState<number | null>(null);
  const [masterReviewsCount, setMasterReviewsCount] = useState(0);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterLoaded, setMasterLoaded] = useState(false);
  const [editMaster, setEditMaster] = useState(false);
  const [masterSaving, setMasterSaving] = useState(false);
  const [masterError, setMasterError] = useState("");
  const [masterSuccess, setMasterSuccess] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (user.role !== "master" || !user.master_id || masterLoaded) return;
    setMasterLoaded(true);
    fetch(`${API.getBids}?master_id=${user.master_id}&mode=master_info`)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (data.id) {
          setMasterStation(data.station || "");
          setMasterSpecialties(data.specialty ? data.specialty.split(", ").filter(Boolean) : []);
          setMasterAddress(data.address || "");
          setMasterCity(data.city || "");
          setMasterRating(data.rating ?? null);
          setMasterReviewsCount(data.reviews_count ?? 0);
          setNotificationsEnabled(data.notifications_enabled !== false);
        }
      })
      .catch(() => {});
  }, [user.master_id, user.role, masterLoaded]);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <ProfileHeader
        user={user}
        masterRating={masterRating}
        masterReviewsCount={masterReviewsCount}
      />

      {user.role === "master" && user.master_id && (
        <MasterStation
          masterId={user.master_id}
          masterStation={masterStation} setMasterStation={setMasterStation}
          masterSpecialties={masterSpecialties} setMasterSpecialties={setMasterSpecialties}
          masterAddress={masterAddress} setMasterAddress={setMasterAddress}
          masterCity={masterCity} setMasterCity={setMasterCity}
          masterLoading={masterLoading} setMasterLoading={setMasterLoading}
          masterRating={masterRating} setMasterRating={setMasterRating}
          masterReviewsCount={masterReviewsCount} setMasterReviewsCount={setMasterReviewsCount}
          editMaster={editMaster} setEditMaster={setEditMaster}
          masterSaving={masterSaving} setMasterSaving={setMasterSaving}
          masterError={masterError} setMasterError={setMasterError}
          masterSuccess={masterSuccess} setMasterSuccess={setMasterSuccess}
        />
      )}

      {user.role !== "master" && (
        <ClientCars
          cars={cars}
          setCars={setCars}
          saveUserCars={saveUserCars}
          userId={user.id}
          addUserCar={addUserCar}
          deleteUserCar={deleteUserCar}
          refreshCars={() => fetchUserCars(user.id).then(f => { if (f.length) { setCars(f); saveUserCars(f); } }).catch(() => {})}
        />
      )}

      <ProfileSettings
        user={user}
        onLogout={onLogout}
        setScreen={setScreen}
        notificationsEnabled={notificationsEnabled}
        setNotificationsEnabled={setNotificationsEnabled}
      />
    </div>
  );
}