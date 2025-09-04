import { useRef, useState } from "react";
import axios from "axios";
import supabase from "./supabase-client";

export default function Validation(props) {
  const num = props.login.number;
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = [useRef(null), useRef(null), useRef(null), useRef(null)];

  function handleChanges(index, value) {
    if (/^[0-9]$/.test(value) || value === "") {
      const newDigit = [...digits];
      newDigit[index] = value;
      setDigits(newDigit);
      if (value !== "" && index < 3) inputRef[index + 1].current.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 4) {
      setError("الرجاء إدخال 4 أرقام");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verify OTP code (replace with your backend)
      const res = await axios.post("http://localhost:3000/api/send-otp", {
        phone: num,
        code,
      });

      if (res.data.success) {
        // ✅ Only now insert the user into Supabase
        const { data: userData, error } = await supabase
          .from("users")
          .insert([
            {
              name: props.login.name,
              phone_number: props.login.number,
              password: props.login.password,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        props.setLogin({ ...props.login, userId: userData.id });
        alert("تم إرسال رمز التحقق وتأكيد الحساب بنجاح!");
        props.setPage(props.page + 1);
      } else {
        setError("فشل في إرسال رمز التحقق");
      }
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء الإرسال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <img
        onClick={() => props.setPage(props.page - 1)}
        src="icons/arrow-left.svg"
        alt=""
      />
      <div className="enter-code">
        <div className="create-account-top">

        <div className="login-steps">
          <span className="active">1</span>
          <span
            style={{
              backgroundColor: "#d9ffec",
              color: "#0f5837",
              border: "1px solid #0f5837",
            }}
            >
            2
          </span>
          <span>3</span>
            </div>
        </div>
        <h3>قم بتأكيد رقم هاتفك</h3>
        <p>
          أدخل رمز التأكيد المكون من 4 أرقام الذي أرسلناه إلى رقم جوالك{" "}
          {props.login.number}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="code-div">
            {digits.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChanges(index, e.target.value)}
                ref={inputRef[index]}
              />
            ))}
          </div>
          {error && (
            <div style={{ color: "red", textAlign: "center", width: "100%" }}>
              {error}
            </div>
          )}
          <button disabled={loading}>التالي</button>
        </form>
      </div>
    </div>
  );
}
