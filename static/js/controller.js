// eruda.init();

const ros = new ROSLIB.Ros({
    url: "ws://192.168.1.5:9090"
});

ros.on("connection", () => {
    console.log("Connected to ROS");
    rover_control.advertise();
});

ros.on("error", (error) => {
    console.log("Error connecting to ROS", error);
});

const rover_control = new ROSLIB.Topic({
    ros: ros,
    name: "/rover_control",
    messageType: "std_msgs/String"
});

const dial = document.getElementById("dial");

// 10% Deadzone of page width
const deadZone = window.innerWidth * 0.1;


let stopFlag = false;
let msg = "";

// document.addEventListener("touchstart", (e) => {
//     e.preventDefault();
// });

document.addEventListener("touchmove", (e) => {
    e.preventDefault();

    const [x, y] = [e.touches[0].clientX, e.touches[0].clientY];

    const {angle, dx, dy} = getPolarVector(x, y);
    console.log(angle, dx, dy);

    // Translate dial and rotate it
    dial.style.transform = `translate(${dx}px, ${dy}px) rotate(${angle}rad)`;

    // Send control
    setControlMsg(dx, dy);
});

document.addEventListener("touchend", (e) => {
    e.preventDefault();
    resetDial();
});

function resetDial() {
    dial.style.transform = `rotate(0rad)`;

    // Send control
    setControlMsg(0, 0);
}

function getPolarVector(x, y) {
    previousP = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    }

    let dx = x - previousP.x;
    let dy = y - previousP.y;

    // Apply cross shaped dead zone for angle

    if (Math.abs(dx) < deadZone) dx = 0;
    if (Math.abs(dy) < deadZone) dy = 0;

    let angle = Math.atan2(dy, dx) + Math.PI / 2;

    if (dx == 0 && dy == 0) angle = 0;

    return {angle, dx, dy};
}

function setControlMsg(dx, dy) {
    if (dx > 0) { // 1st and 4th quadrant
        if (dy > 0) { // 4th quadrant
            msg = "c";
        } else if (dy < 0) { // 1st quadrant
            msg = "e";
        } else { // Right
            msg = "d";
        }
    } else if (dx < 0) { // 2nd and 3rd quadrant
        if (dy > 0) { // 3rd quadrant
            msg = "z";
        } else if (dy < 0) { // 2nd quadrant
            msg = "q";
        } else { // Left
            msg = "a";
        }
    } else { // Center
        if (dy > 0) { // Down
            msg = "s";
        } else if (dy < 0) { // Up
            msg = "w";
        } else { // Center
            msg = "-";
        }
    }
}

setInterval(() => { // 10Hz loop
    if (msg == '-' && stopFlag || msg == '') {
        return;
    }

    stopFlag = msg == '-';
    
    const message = new ROSLIB.Message({
        data: msg
    });

    rover_control.publish(message);
}, 100);