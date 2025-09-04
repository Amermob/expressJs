import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import supabase from "./supabase-client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function CompanyInfo(props) {
  const [prev, setPrev] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [pdfUrls, setPdfUrls] = useState([]);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState({ lat: 24.7136, lng: 46.6753 });
  const [stores, setStores] = useState([]);

  // ✅ Upload file helper
  const uploadFile = async (file, companyId, type) => {
    if (!file) return null;

    const cleanFileName = file.name
      .replace(/\s+/g, "_")
      .replace(/[^\w.-]/g, "");

    const path = `companies/${companyId}/${type}/${cleanFileName}`;

    const { error } = await supabase.storage
      .from("files")
      .upload(path, file, { upsert: true });

    if (error) {
      console.error("❌ Upload error:", error.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from("files")
      .getPublicUrl(path);

    return publicData?.publicUrl || null;
  };

  // ✅ Handle form submission
  const handleForm = async (formData) => {
    const companyId = uuidv4();
    let logoUrl = null;

    try {
      // 1️⃣ Upload logo
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, companyId, "logo");
      }

      // 2️⃣ Insert company
      const companyData = {
        id: companyId,
        user_id: props.login?.userId, // ✅ link to logged-in user
        name: formData.get("company-name"),
        activity: formData.get("company-activity"),
        location: formData.get("location"),
        lat: coords.lat,
        lng: coords.lng,
        logo: logoUrl,
        phone_number: props.login?.number || null,
      };

      const { error: companyError } = await supabase
        .from("companies")
        .insert(companyData);

      if (companyError) throw companyError;

      // 3️⃣ Upload PDFs + Insert into files table
      for (const pdf of pdfFiles) {
        const pdfUrl = await uploadFile(pdf, companyId, "docs");
        if (pdfUrl) {
          await supabase.from("files").insert({
            company_id: companyId,
            file_type: "document",
            file_url: pdfUrl,
          });
        }
      }

      console.log("✅ Company saved:", companyData);
      props.setPage(props.page + 1);
    } catch (err) {
      console.error("❌ Error saving company:", err.message);
      alert("حدث خطأ أثناء حفظ الشركة. حاول مرة أخرى.");
    }
  };

  // ✅ File handlers
  const getPhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setPrev(URL.createObjectURL(file));
    }
  };

  const getFile = (e) => {
    const files = Array.from(e.target.files).filter(
      (f) => f.type === "application/pdf"
    );
    if (files.length !== e.target.files.length) {
      alert("يسمح فقط برفع ملفات PDF.");
    }
    setPdfFiles(files);
    setPdfUrls(files?.map((file) => URL.createObjectURL(file)));
  };

  // ✅ Fetch coords for address
  const fetchCoordinates = async (query) => {
    if (!query.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=sa&limit=1`
      );
      const data = await res.json();
      if (!data.length) return;
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      setCoords({ lat, lng });
      fetchStores(lat, lng);
    } catch (err) {
      console.error("Error fetching coordinates:", err);
    }
  };

  // ✅ Fetch nearby shops
  const fetchStores = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&amenity=shop&lat=${lat}&lon=${lng}&radius=2000`
      );
      const data = await res.json();
      setStores(data);
    } catch (err) {
      console.error("Error fetching stores:", err);
    }
  };

  // Debounced search for address
  useEffect(() => {
    const delay = setTimeout(() => {
      if (address) fetchCoordinates(address);
    }, 500);
    return () => clearTimeout(delay);
  }, [address]);

  // ✅ Map click to update coords
  const ClickHandler = () => {
    const map = useMap();
    useEffect(() => {
      map.on("click", (e) => {
        setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        fetchStores(e.latlng.lat, e.latlng.lng);
      });
    }, [map]);
    return null;
  };

  return (
    <div className="login">
      <img
        onClick={() => props.setPage(props.page - 1)}
        src="icons/arrow-left.svg"
        alt=""
      />
      <div className="create-account-top">
        <div className="login-steps">
          <span className="done">1</span>
          <span className="done">2</span>
          <span
            style={{
              backgroundColor: "#d9ffec",
              color: "#0f5837",
              border: "1px solid #0f5837",
            }}
          >
            3
          </span>
        </div>
        <h1>قم انشاء شركة</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleForm(new FormData(e.target));
        }}
      >
        <div className="companies-info">
          <div>
            <label>
              نشاط الشركة*
              <input
                required
                type="text"
                name="company-activity"
                placeholder=" نشاط الشركة"
              />
            </label>
          </div>
          <div>
            <label>
              اسم الشركة*
              <input
                required
                name="company-name"
                type="text"
                placeholder=" اسم الشركة"
              />
            </label>
          </div>
        </div>

        <div className="img-container">
          <label className="file" htmlFor="img">
            قم بتحميل الصورة أو اسحبها هنا
            <input
              required
              onChange={getPhoto}
              type="file"
              name="img"
              id="img"
            />
          </label>
          <img src={prev || "icons/empty-img-file.svg"} alt="" />
        </div>

        <div className="single-company">
          <label htmlFor="company">شركات</label>
          <input type="checkbox" id="company" />
          <label htmlFor="not-company">افراد</label>
          <input type="checkbox" name="not-company" />
        </div>

        <div className="companies-info">
          <div>
            <label className="company-file" htmlFor="file">
              <p>وثائق الشركة / المؤسسة*</p>
              <span className="upload-file-btn">
                أرفق الملفات (سجل تجاري...)
                <img src="icons/circle-plus.svg" alt="" />
              </span>
              <input
                required
                type="file"
                accept="application/pdf"
                onChange={getFile}
                id="file"
                multiple
              />
            </label>
          </div>
          <div>
            <label className="upload">
              عنوان الشركة
              <input
                name="location"
                required
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="عنوان الشركة"
              />
              <img src="icons/locate-fixed.svg" alt="" />
            </label>
          </div>
        </div>

        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={15}
          style={{ width: "100%", height: "160px" }}
          key={`${coords.lat}-${coords.lng}`}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[coords.lat, coords.lng]}>
            <Popup>Selected Location</Popup>
          </Marker>
          {stores?.map((store, i) => (
            <Marker
              key={i}
              position={[parseFloat(store.lat), parseFloat(store.lon)]}
            >
              <Popup>{store.display_name}</Popup>
            </Marker>
          ))}
          <ClickHandler />
        </MapContainer>

        <label className="terms password" htmlFor="check">
          <input type="checkbox" id="check" required />
          الموافقة على<span>الشروط والأحكام الخاصة بتطبيق تكلفة</span>
        </label>
        <button type="submit">التالي</button>
      </form>
    </div>
  );
}
