


document.getElementById('signInButton').onclick = () => {
    try {
        window.electronAPI.goAuthPage("sign-in");

        if (!document.querySelector('.success-message')) {
            const message = document.createElement('p');
            message.textContent = 'A browser was opened for you';
            message.className = 'success-message';

            const container = document.querySelector('.container');
            const footer = document.querySelector('.footer');
            container.insertBefore(message, footer);
        }
    } catch (error) {
        console.log("Error signing in :",error)

    }
};